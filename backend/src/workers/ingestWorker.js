/**
 * Ingest Worker
 * Processes documents, creates embeddings, and stores in vector database
 */

const config = require('../config');
const WebScraper = require('../utils/scraper');
const { TextChunker } = require('../utils/chunker');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { QdrantClient } = require('@qdrant/js-client-rest');

/**
 * Document ingestion worker for RAG pipeline
 */
class IngestWorker {
  constructor(options = {}) {
    this.vectorDbType = config.VECTOR_DB_TYPE;
    this.scraper = new WebScraper();
    this.chunker = new TextChunker({
      chunkSize: config.CHUNK_SIZE,
      chunkOverlap: config.CHUNK_OVERLAP
    });
    
    // Initialize vector database client
    this.vectorDb = null;
    this.embeddingService = null;
    this.isInitialized = false;
  }

  /**
   * Ensures services are initialized
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeServices();
      this.isInitialized = true;
    }
  }

  /**
   * Initializes vector database and embedding services
   */
  async initializeServices() {
    try {
      // Initialize embedding service - prioritize Hugging Face
      if (config.HF_TOKEN) {
        this.embeddingService = new HuggingFaceEmbeddingService();
        console.log('🤗 Using Hugging Face embeddings');
      } else if (config.OPENAI_API_KEY) {
        this.embeddingService = new OpenAIEmbeddingService();
        console.log('🤖 Using OpenAI embeddings');
      } else {
        // Fallback to mock service for development
        this.embeddingService = new MockEmbeddingService();
        console.log('� Using mock embeddings (no API keys configured)');
      }

      // Initialize vector database
      if (this.vectorDbType === 'pinecone' && config.PINECONE_API_KEY) {
        this.vectorDb = new PineconeService();
        await this.vectorDb.initialize();
        console.log('🌲 Connected to Pinecone');
      } else if (this.vectorDbType === 'qdrant' && config.QDRANT_URL) {
        // Try to connect to Qdrant
        this.vectorDb = new QdrantService();
        try {
          await this.vectorDb.initialize();
          console.log('🔍 Connected to Qdrant');
        } catch (error) {
          console.log('⚠️ Qdrant not available, using mock service:', error.message);
          this.vectorDb = new MockVectorService();
          await this.vectorDb.initialize();
        }
      } else {
        // Default to mock service for development
        this.vectorDb = new MockVectorService();
        await this.vectorDb.initialize();
        console.log('🧪 Using mock vector database');
      }
    } catch (error) {
      console.error('❌ Failed to initialize services:', error.message);
      // Use mock services for development
      this.embeddingService = new MockEmbeddingService();
      this.vectorDb = new MockVectorService();
      await this.vectorDb.initialize();
      console.log('🧪 Using mock services for development');
    }
  }

  /**
   * Processes and ingests documents from various sources
   * @param {Object} sources - Configuration of sources to ingest
   * @returns {Promise<Object>} Ingestion results
   */
  async ingestDocuments(sources = {}) {
    // Ensure services are initialized
    await this.ensureInitialized();
    
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      chunks: 0,
      errors: []
    };

    try {
      // Process web URLs
      if (sources.urls && sources.urls.length > 0) {
        console.log(`🌐 Processing ${sources.urls.length} URLs...`);
        const webResults = await this.ingestWebUrls(sources.urls);
        this.mergeResults(results, webResults);
      }

      // Process local files
      if (sources.files && sources.files.length > 0) {
        console.log(`📁 Processing ${sources.files.length} files...`);
        const fileResults = await this.ingestFiles(sources.files);
        this.mergeResults(results, fileResults);
      }

      // Process directory
      if (sources.directory) {
        console.log(`📂 Processing directory: ${sources.directory}`);
        const dirResults = await this.ingestDirectory(sources.directory);
        this.mergeResults(results, dirResults);
      }

      console.log(`✅ Ingestion complete: ${results.successful}/${results.processed} documents, ${results.chunks} chunks`);
      return results;

    } catch (error) {
      console.error('❌ Ingestion failed:', error.message);
      results.errors.push(error.message);
      return results;
    }
  }

  /**
   * Ingests documents from web URLs
   * @param {Array<string>} urls - URLs to scrape and ingest
   * @returns {Promise<Object>} Processing results
   */
  async ingestWebUrls(urls) {
    const results = { processed: 0, successful: 0, failed: 0, chunks: 0, errors: [] };
    
    const scrapedResults = await this.scraper.scrapeUrls(urls);
    
    for (const result of scrapedResults) {
      results.processed++;
      
      if (result.success) {
        try {
          const chunkResults = await this.processDocument(result.content);
          results.successful++;
          results.chunks += chunkResults.chunks;
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to process ${result.url}: ${error.message}`);
        }
      } else {
        results.failed++;
        results.errors.push(`Failed to scrape ${result.url}: ${result.error}`);
      }
    }
    
    return results;
  }

  /**
   * Ingests documents from local files
   * @param {Array<string>} filePaths - File paths to process
   * @returns {Promise<Object>} Processing results
   */
  async ingestFiles(filePaths) {
    const results = { processed: 0, successful: 0, failed: 0, chunks: 0, errors: [] };
    
    for (const filePath of filePaths) {
      results.processed++;
      
      try {
        const content = await this.loadFile(filePath);
        const chunkResults = await this.processDocument(content);
        results.successful++;
        results.chunks += chunkResults.chunks;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to process ${filePath}: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Ingests all documents from a directory
   * @param {string} directoryPath - Directory to process
   * @returns {Promise<Object>} Processing results
   */
  async ingestDirectory(directoryPath) {
    const files = await this.findDocumentFiles(directoryPath);
    return this.ingestFiles(files);
  }

  /**
   * Processes a single document through the RAG pipeline
   * @param {Object} document - Document to process
   * @returns {Promise<Object>} Processing results
   */
  async processDocument(document) {
    try {
      // Create chunks
      const chunks = this.chunker.chunkText(document.content, {
        title: document.title,
        url: document.url,
        domain: document.domain,
        scrapedAt: document.scrapedAt
      });

      console.log(`📄 Created ${chunks.length} chunks for "${document.title}"`);

      // Generate embeddings for chunks
      const embeddings = await this.generateEmbeddings(chunks);

      // Store in vector database
      await this.storeChunks(chunks, embeddings);

      return {
        chunks: chunks.length,
        document: document.title || document.url
      };

    } catch (error) {
      console.error(`❌ Error processing document:`, error.message);
      throw error;
    }
  }

  /**
   * Generates embeddings for text chunks
   * @param {Array<Object>} chunks - Text chunks
   * @returns {Promise<Array<Array<number>>>} Embeddings array
   */
  async generateEmbeddings(chunks) {
    const embeddings = [];
    const batchSize = 10; // Process in batches to avoid rate limits
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.text);
      
      try {
        const batchEmbeddings = await this.embeddingService.createEmbeddings(texts);
        embeddings.push(...batchEmbeddings);
        
        // Rate limiting
        if (i + batchSize < chunks.length) {
          await this.sleep(100); // 100ms delay between batches
        }
        
      } catch (error) {
        console.error(`❌ Error generating embeddings for batch ${i}:`, error.message);
        // Add empty embeddings for failed batch
        embeddings.push(...Array(batch.length).fill([]));
      }
    }
    
    return embeddings;
  }

  /**
   * Stores chunks and embeddings in vector database
   * @param {Array<Object>} chunks - Text chunks
   * @param {Array<Array<number>>} embeddings - Corresponding embeddings
   * @returns {Promise<void>}
   */
  async storeChunks(chunks, embeddings) {
    const vectors = chunks.map((chunk, index) => ({
      id: chunk.id,
      vector: embeddings[index] || [],
      metadata: {
        text: chunk.text,
        ...chunk.metadata
      }
    }));

    await this.vectorDb.upsertVectors(vectors);
    console.log(`💾 Stored ${vectors.length} vectors in database`);
  }

  /**
   * Loads a file and extracts content
   * @param {string} filePath - Path to file
   * @returns {Promise<Object>} File content object
   */
  async loadFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    return {
      title: path.basename(filePath),
      content,
      url: `file://${filePath}`,
      filePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString()
    };
  }

  /**
   * Finds document files in directory recursively
   * @param {string} dirPath - Directory path
   * @returns {Promise<Array<string>>} Array of file paths
   */
  async findDocumentFiles(dirPath) {
    const files = [];
    const supportedExtensions = ['.txt', '.md', '.json', '.html', '.htm'];
    
    async function scanDirectory(currentPath) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (supportedExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }
    
    await scanDirectory(dirPath);
    return files;
  }

  /**
   * Merges processing results
   * @param {Object} target - Target results object
   * @param {Object} source - Source results object
   */
  mergeResults(target, source) {
    target.processed += source.processed;
    target.successful += source.successful;
    target.failed += source.failed;
    target.chunks += source.chunks;
    target.errors.push(...source.errors);
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Embedding Services

/**
 * OpenAI Embedding Service
 */
class OpenAIEmbeddingService {
  constructor() {
    this.apiKey = config.OPENAI_API_KEY;
    this.model = config.EMBEDDING_MODEL;
  }

  async createEmbeddings(texts) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: this.model,
          input: texts
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data.map(item => item.embedding);
    } catch (error) {
      throw new Error(`OpenAI embedding error: ${error.message}`);
    }
  }
}

/**
 * Hugging Face Embedding Service
 */
class HuggingFaceEmbeddingService {
  constructor() {
    this.apiKey = config.HF_TOKEN;
    this.model = config.HF_EMBEDDING_MODEL;
  }

  async createEmbeddings(texts) {
    if (!this.apiKey) {
      throw new Error('Hugging Face token not configured');
    }

    try {
      const embeddings = [];
      
      for (const text of texts) {
        const response = await axios.post(
          `https://api-inference.huggingface.co/models/${this.model}`,
          { inputs: text },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        embeddings.push(response.data);
      }
      
      return embeddings;
    } catch (error) {
      throw new Error(`Hugging Face embedding error: ${error.message}`);
    }
  }
}

/**
 * Mock Embedding Service for development
 */
class MockEmbeddingService {
  async createEmbeddings(texts) {
    console.log('🧪 Using mock embeddings');
    // Return random embeddings for development
    return texts.map(() => Array.from({ length: config.EMBEDDING_DIMENSION }, () => Math.random() - 0.5));
  }
}

// Vector Database Services

/**
 * Qdrant Vector Database Service
 */
class QdrantService {
  constructor() {
    this.url = config.QDRANT_URL;
    this.apiKey = config.QDRANT_API_KEY;
    this.collection = config.QDRANT_COLLECTION;
    this.client = null;
  }

  async initialize() {
    try {
      // Initialize Qdrant client
      this.client = new QdrantClient({
        url: this.url,
        apiKey: this.apiKey
      });
      
      // Test connection and create collection if needed
      await this.createCollection();
      console.log('✅ Qdrant connection established');
    } catch (error) {
      console.error('❌ Qdrant initialization failed:', error.message);
      // Fall back to HTTP API calls
      this.client = null;
    }
  }

  async createCollection() {
    try {
      if (this.client) {
        // Using Qdrant client
        await this.client.createCollection(this.collection, {
          vectors: {
            size: config.EMBEDDING_DIMENSION,
            distance: 'Cosine'
          }
        });
      } else {
        // Fall back to HTTP API
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['api-key'] = this.apiKey;

        await axios.put(
          `${this.url}/collections/${this.collection}`,
          {
            vectors: {
              size: config.EMBEDDING_DIMENSION,
              distance: 'Cosine'
            }
          },
          { headers }
        );
      }
    } catch (error) {
      if (error.message.includes('already exists') || error.response?.status === 409) {
        console.log('📝 Collection already exists');
      } else {
        throw error;
      }
    }
  }

  async upsertVectors(vectors) {
    try {
      if (this.client) {
        // Using Qdrant client
        const points = vectors.map(v => ({
          id: v.id,
          vector: v.vector,
          payload: v.metadata
        }));

        await this.client.upsert(this.collection, {
          wait: true,
          points: points
        });
      } else {
        // Fall back to HTTP API
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['api-key'] = this.apiKey;

        const points = vectors.map(v => ({
          id: v.id,
          vector: v.vector,
          payload: v.metadata
        }));

        await axios.put(
          `${this.url}/collections/${this.collection}/points`,
          { points },
          { headers }
        );
      }
    } catch (error) {
      console.error('❌ Failed to upsert vectors to Qdrant:', error.message);
      throw error;
    }
  }
}

/**
 * Pinecone Vector Database Service
 */
class PineconeService {
  constructor() {
    this.apiKey = config.PINECONE_API_KEY;
    this.environment = config.PINECONE_ENVIRONMENT;
    this.indexName = config.PINECONE_INDEX;
  }

  async initialize() {
    // TODO: Initialize Pinecone client
    // This requires the Pinecone SDK
    console.log('🌲 Pinecone initialization - TODO: Add Pinecone SDK');
  }

  async upsertVectors(vectors) {
    // TODO: Implement Pinecone upsert
    console.log('🌲 Pinecone upsert - TODO: Implement with Pinecone SDK');
  }
}

/**
 * Mock Vector Database Service for development
 */
class MockVectorService {
  constructor() {
    this.vectors = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    this.isInitialized = true;
    console.log('🧪 Mock vector database initialized');
  }

  async upsertVectors(vectors) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    vectors.forEach(v => {
      this.vectors.set(v.id, v);
    });
    console.log(`🧪 Mock stored ${vectors.length} vectors (total: ${this.vectors.size})`);
  }

  async search(vector, limit = 5) {
    // Mock search returning random results
    const results = Array.from(this.vectors.values())
      .slice(0, limit)
      .map(v => ({
        id: v.id,
        score: Math.random() * 0.5 + 0.5, // Random score between 0.5-1.0
        payload: v.metadata
      }));
    
    return results;
  }
}

module.exports = IngestWorker;