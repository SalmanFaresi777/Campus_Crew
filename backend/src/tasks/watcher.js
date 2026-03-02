/**
 * File System Watcher
 * Monitors directories for changes and triggers re-ingestion
 */

const chokidar = require('chokidar');
const config = require('../config');
const IngestWorker = require('../workers/ingestWorker');
const path = require('path');
const fs = require('fs').promises;

/**
 * File Watcher Service
 * Monitors file changes and triggers document re-ingestion
 */
class FileWatcher {
  constructor(options = {}) {
    this.directories = options.directories || config.WATCH_DIRECTORIES;
    this.debounceDelay = options.debounceDelay || 2000; // 2 seconds
    this.ingestWorker = new IngestWorker();
    
    this.watchers = new Map();
    this.changeQueue = new Map(); // File path -> timeout
    this.isProcessing = false;
    
    // File patterns to watch
    this.watchPatterns = options.watchPatterns || [
      '**/*.txt',
      '**/*.md',
      '**/*.json',
      '**/*.html',
      '**/*.htm'
    ];
    
    // Files/directories to ignore
    this.ignorePatterns = options.ignorePatterns || [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/*.log',
      '**/temp/**',
      '**/tmp/**'
    ];
  }

  /**
   * Starts watching configured directories
   * @returns {Promise<void>}
   */
  async start() {
    console.log('👁️ Starting file watcher...');
    
    // Ensure directories exist
    for (const directory of this.directories) {
      try {
        await fs.access(directory);
        await this.watchDirectory(directory);
        console.log(`👁️ Watching directory: ${directory}`);
      } catch (error) {
        console.warn(`⚠️ Directory not found, creating: ${directory}`);
        try {
          await fs.mkdir(directory, { recursive: true });
          await this.watchDirectory(directory);
          console.log(`👁️ Created and watching directory: ${directory}`);
        } catch (createError) {
          console.error(`❌ Failed to create directory ${directory}:`, createError.message);
        }
      }
    }
    
    console.log(`✅ File watcher started, monitoring ${this.watchers.size} directories`);
  }

  /**
   * Stops all file watchers
   * @returns {Promise<void>}
   */
  async stop() {
    console.log('⏹️ Stopping file watcher...');
    
    // Clear any pending changes
    for (const timeout of this.changeQueue.values()) {
      clearTimeout(timeout);
    }
    this.changeQueue.clear();
    
    // Close all watchers
    for (const [directory, watcher] of this.watchers) {
      await watcher.close();
      console.log(`👁️ Stopped watching: ${directory}`);
    }
    
    this.watchers.clear();
    console.log('✅ File watcher stopped');
  }

  /**
   * Watches a specific directory
   * @param {string} directory - Directory path to watch
   * @returns {Promise<void>}
   */
  async watchDirectory(directory) {
    const absolutePath = path.resolve(directory);
    
    const watcher = chokidar.watch(this.watchPatterns.map(pattern => path.join(absolutePath, pattern)), {
      ignored: this.ignorePatterns.map(pattern => path.join(absolutePath, pattern)),
      persistent: true,
      ignoreInitial: true, // Don't trigger on startup
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      },
      depth: 10 // Maximum directory depth
    });

    // Event handlers
    watcher
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('unlink', (filePath) => this.handleFileChange('delete', filePath))
      .on('addDir', (dirPath) => console.log(`📁 Directory added: ${dirPath}`))
      .on('unlinkDir', (dirPath) => console.log(`📁 Directory removed: ${dirPath}`))
      .on('error', (error) => console.error(`❌ Watcher error in ${directory}:`, error))
      .on('ready', () => console.log(`👁️ Initial scan complete for ${directory}`));

    this.watchers.set(directory, watcher);
  }

  /**
   * Handles file change events with debouncing
   * @param {string} eventType - Type of change (add, change, delete)
   * @param {string} filePath - Path to changed file
   */
  handleFileChange(eventType, filePath) {
    const normalizedPath = path.normalize(filePath);
    
    console.log(`📝 File ${eventType}: ${normalizedPath}`);
    
    // Clear existing timeout for this file
    if (this.changeQueue.has(normalizedPath)) {
      clearTimeout(this.changeQueue.get(normalizedPath));
    }
    
    // Set new debounced timeout
    const timeout = setTimeout(() => {
      this.processFileChange(eventType, normalizedPath);
      this.changeQueue.delete(normalizedPath);
    }, this.debounceDelay);
    
    this.changeQueue.set(normalizedPath, timeout);
  }

  /**
   * Processes a file change after debouncing
   * @param {string} eventType - Type of change
   * @param {string} filePath - Path to changed file
   */
  async processFileChange(eventType, filePath) {
    if (this.isProcessing) {
      console.log(`⏳ Skipping ${filePath} - another ingestion in progress`);
      return;
    }

    try {
      this.isProcessing = true;
      
      console.log(`🔄 Processing ${eventType} for: ${filePath}`);
      
      switch (eventType) {
        case 'add':
        case 'change':
          await this.ingestFile(filePath);
          break;
          
        case 'delete':
          await this.removeFile(filePath);
          break;
          
        default:
          console.warn(`⚠️ Unknown event type: ${eventType}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${eventType} for ${filePath}:`, error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Ingests a single file
   * @param {string} filePath - Path to file to ingest
   * @returns {Promise<void>}
   */
  async ingestFile(filePath) {
    try {
      console.log(`📥 Ingesting file: ${filePath}`);
      
      const result = await this.ingestWorker.ingestFiles([filePath]);
      
      if (result.successful > 0) {
        console.log(`✅ Successfully ingested ${filePath} - ${result.chunks} chunks created`);
      } else {
        console.error(`❌ Failed to ingest ${filePath}:`, result.errors.join(', '));
      }
      
    } catch (error) {
      console.error(`❌ Ingestion error for ${filePath}:`, error.message);
    }
  }

  /**
   * Removes a file from the vector database
   * @param {string} filePath - Path to removed file
   * @returns {Promise<void>}
   */
  async removeFile(filePath) {
    try {
      console.log(`🗑️ Removing file from database: ${filePath}`);
      
      // Generate the document ID that would have been used
      const fileName = path.basename(filePath, path.extname(filePath));
      const documentId = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // TODO: Implement removal from vector database
      // This would depend on the vector database implementation
      if (this.ingestWorker.vectorDb && this.ingestWorker.vectorDb.deleteDocument) {
        await this.ingestWorker.vectorDb.deleteDocument(documentId);
        console.log(`✅ Removed ${filePath} from vector database`);
      } else {
        console.log(`⚠️ Vector database doesn't support deletion or not implemented`);
      }
      
    } catch (error) {
      console.error(`❌ Removal error for ${filePath}:`, error.message);
    }
  }

  /**
   * Manually triggers re-ingestion of all watched directories
   * @returns {Promise<Object>} Ingestion results
   */
  async reindex() {
    console.log('🔄 Manual reindexing triggered...');
    
    try {
      this.isProcessing = true;
      
      const sources = {
        files: [],
        urls: config.SCRAPE_URLS
      };
      
      // Collect all files from watched directories
      for (const directory of this.directories) {
        try {
          const files = await this.findAllFiles(directory);
          sources.files.push(...files);
        } catch (error) {
          console.error(`❌ Error scanning directory ${directory}:`, error.message);
        }
      }
      
      console.log(`📂 Found ${sources.files.length} files to reindex`);
      
      const result = await this.ingestWorker.ingestDocuments(sources);
      
      console.log(`✅ Reindexing complete: ${result.successful}/${result.processed} documents, ${result.chunks} chunks`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Reindexing failed:', error.message);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Finds all supported files in a directory
   * @param {string} directory - Directory to scan
   * @returns {Promise<Array<string>>} Array of file paths
   */
  async findAllFiles(directory) {
    const files = [];
    const supportedExtensions = ['.txt', '.md', '.json', '.html', '.htm'];
    
    async function scanDirectory(currentPath) {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          // Skip ignored patterns
          const relativePath = path.relative(directory, fullPath);
          const shouldIgnore = [
            'node_modules',
            '.git',
            'dist',
            'build',
            'temp',
            'tmp'
          ].some(ignore => relativePath.includes(ignore));
          
          if (shouldIgnore) continue;
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (supportedExtensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Cannot read directory ${currentPath}:`, error.message);
      }
    }
    
    await scanDirectory(directory);
    return files;
  }

  /**
   * Gets current watcher status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.watchers.size > 0,
      watchedDirectories: Array.from(this.watchers.keys()),
      pendingChanges: this.changeQueue.size,
      isProcessing: this.isProcessing,
      watchPatterns: this.watchPatterns,
      ignorePatterns: this.ignorePatterns
    };
  }

  /**
   * Adds a new directory to watch
   * @param {string} directory - Directory path to add
   * @returns {Promise<void>}
   */
  async addDirectory(directory) {
    const absolutePath = path.resolve(directory);
    
    if (this.watchers.has(absolutePath)) {
      console.log(`👁️ Directory already being watched: ${absolutePath}`);
      return;
    }
    
    try {
      await fs.access(absolutePath);
      await this.watchDirectory(absolutePath);
      this.directories.push(absolutePath);
      console.log(`👁️ Added directory to watch list: ${absolutePath}`);
    } catch (error) {
      console.error(`❌ Cannot add directory ${absolutePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Removes a directory from watching
   * @param {string} directory - Directory path to remove
   * @returns {Promise<void>}
   */
  async removeDirectory(directory) {
    const absolutePath = path.resolve(directory);
    
    if (!this.watchers.has(absolutePath)) {
      console.log(`👁️ Directory not being watched: ${absolutePath}`);
      return;
    }
    
    const watcher = this.watchers.get(absolutePath);
    await watcher.close();
    this.watchers.delete(absolutePath);
    
    this.directories = this.directories.filter(dir => path.resolve(dir) !== absolutePath);
    
    console.log(`👁️ Removed directory from watch list: ${absolutePath}`);
  }
}

module.exports = FileWatcher;