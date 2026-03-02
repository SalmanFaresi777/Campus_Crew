/**
 * Text Chunking Utility
 * Splits documents into manageable chunks for vector embedding
 */

/**
 * Text chunker for splitting documents into optimal sizes for embeddings
 */
class TextChunker {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 1000;
    this.chunkOverlap = options.chunkOverlap || 200;
    this.separators = options.separators || [
      '\\n\\n',      // Paragraphs
      '\\n',         // Lines
      '. ',          // Sentences
      '! ',          // Exclamations
      '? ',          // Questions
      '; ',          // Semicolons
      ', ',          // Commas
      ' '            // Words
    ];
    this.minChunkSize = options.minChunkSize || 100;
    this.maxChunkSize = options.maxChunkSize || this.chunkSize * 2;
  }

  /**
   * Chunks a document into smaller pieces with overlap
   * @param {string} text - Text to chunk
   * @param {Object} metadata - Document metadata
   * @returns {Array<Object>} Array of chunk objects
   */
  chunkText(text, metadata = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    // Normalize text
    const normalizedText = this.normalizeText(text);
    
    // If text is smaller than chunk size, return as single chunk
    if (normalizedText.length <= this.chunkSize) {
      return [{
        id: this.generateChunkId(metadata, 0),
        text: normalizedText,
        metadata: {
          ...metadata,
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: normalizedText.length,
          wordCount: this.countWords(normalizedText)
        }
      }];
    }

    const chunks = [];
    let currentPosition = 0;
    let chunkIndex = 0;

    while (currentPosition < normalizedText.length) {
      // Find the end position for this chunk
      let endPosition = Math.min(
        currentPosition + this.chunkSize,
        normalizedText.length
      );

      // Try to break at a natural boundary
      const chunkText = this.findOptimalChunk(
        normalizedText,
        currentPosition,
        endPosition
      );

      // Create chunk object
      const chunk = {
        id: this.generateChunkId(metadata, chunkIndex),
        text: chunkText,
        metadata: {
          ...metadata,
          chunkIndex,
          startOffset: currentPosition,
          endOffset: currentPosition + chunkText.length,
          wordCount: this.countWords(chunkText)
        }
      };

      chunks.push(chunk);

      // Move to next position with overlap
      const moveDistance = Math.max(
        chunkText.length - this.chunkOverlap,
        this.minChunkSize
      );
      
      currentPosition += moveDistance;
      chunkIndex++;
    }

    // Add total chunks count to all chunks
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Finds optimal chunk boundaries using separators
   * @param {string} text - Full text
   * @param {number} start - Start position
   * @param {number} end - Desired end position
   * @returns {string} Optimal chunk text
   */
  findOptimalChunk(text, start, end) {
    const desiredChunk = text.substring(start, end);
    
    // If we're at the end of the text, return what we have
    if (end >= text.length) {
      return text.substring(start);
    }

    // Try to find a good breaking point using separators
    for (const separator of this.separators) {
      const lastSeparatorIndex = desiredChunk.lastIndexOf(separator);
      
      if (lastSeparatorIndex > this.minChunkSize) {
        const chunk = desiredChunk.substring(0, lastSeparatorIndex + separator.length);
        
        // Make sure chunk isn't too small
        if (chunk.trim().length >= this.minChunkSize) {
          return chunk.trim();
        }
      }
    }

    // If no good separator found, just cut at chunk size
    return desiredChunk;
  }

  /**
   * Normalizes text for consistent processing
   * @param {string} text - Raw text
   * @returns {string} Normalized text
   */
  normalizeText(text) {
    return text
      .replace(/\\r\\n/g, '\\n')        // Normalize line endings
      .replace(/\\r/g, '\\n')           // Convert CR to LF
      .replace(/\\t/g, ' ')             // Convert tabs to spaces
      .replace(/[\\u2000-\\u206F\\u2E00-\\u2E7F\\\\''""]/g, ' ') // Remove fancy quotes and spaces
      .replace(/\\s+/g, ' ')            // Normalize whitespace
      .trim();
  }

  /**
   * Generates a unique chunk ID
   * @param {Object} metadata - Document metadata
   * @param {number} chunkIndex - Index of the chunk
   * @returns {string} Unique chunk ID
   */
  generateChunkId(metadata, chunkIndex) {
    const docId = metadata.id || metadata.url || metadata.title || 'unknown';
    const safeDocId = docId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${safeDocId}_chunk_${chunkIndex}`;
  }

  /**
   * Counts words in text
   * @param {string} text - Text to count
   * @returns {number} Word count
   */
  countWords(text) {
    return text.trim().split(/\\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Chunks multiple documents
   * @param {Array<Object>} documents - Array of document objects
   * @returns {Array<Object>} Array of all chunks
   */
  chunkDocuments(documents) {
    const allChunks = [];
    
    documents.forEach((doc, docIndex) => {
      try {
        const text = doc.content || doc.text || '';
        const metadata = {
          ...doc,
          documentIndex: docIndex,
          originalLength: text.length
        };
        
        const chunks = this.chunkText(text, metadata);
        allChunks.push(...chunks);
        
        console.log(`📄 Chunked document "${doc.title || doc.id || 'Untitled'}" into ${chunks.length} chunks`);
        
      } catch (error) {
        console.error(`❌ Error chunking document ${docIndex}:`, error.message);
      }
    });
    
    return allChunks;
  }

  /**
   * Analyzes chunking effectiveness
   * @param {Array<Object>} chunks - Array of chunks
   * @returns {Object} Analysis results
   */
  analyzeChunks(chunks) {
    if (!chunks.length) {
      return { totalChunks: 0 };
    }

    const chunkSizes = chunks.map(chunk => chunk.text.length);
    const wordCounts = chunks.map(chunk => chunk.metadata.wordCount || 0);
    
    return {
      totalChunks: chunks.length,
      averageChunkSize: Math.round(chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length),
      minChunkSize: Math.min(...chunkSizes),
      maxChunkSize: Math.max(...chunkSizes),
      averageWordCount: Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length),
      totalWords: wordCounts.reduce((a, b) => a + b, 0),
      chunksUnderMin: chunkSizes.filter(size => size < this.minChunkSize).length,
      chunksOverMax: chunkSizes.filter(size => size > this.maxChunkSize).length
    };
  }

  /**
   * Merges small adjacent chunks if beneficial
   * @param {Array<Object>} chunks - Array of chunks
   * @returns {Array<Object>} Optimized chunks
   */
  optimizeChunks(chunks) {
    if (chunks.length <= 1) return chunks;

    const optimized = [];
    let currentChunk = chunks[0];

    for (let i = 1; i < chunks.length; i++) {
      const nextChunk = chunks[i];
      
      // Check if we should merge with the next chunk
      const combinedLength = currentChunk.text.length + nextChunk.text.length;
      const bothSmall = currentChunk.text.length < this.minChunkSize && 
                       nextChunk.text.length < this.minChunkSize;
      
      if (bothSmall && combinedLength <= this.chunkSize) {
        // Merge chunks
        currentChunk = {
          id: currentChunk.id,
          text: currentChunk.text + ' ' + nextChunk.text,
          metadata: {
            ...currentChunk.metadata,
            endOffset: nextChunk.metadata.endOffset,
            wordCount: currentChunk.metadata.wordCount + nextChunk.metadata.wordCount,
            merged: true,
            mergedFrom: [currentChunk.id, nextChunk.id]
          }
        };
      } else {
        // Keep current chunk and move to next
        optimized.push(currentChunk);
        currentChunk = nextChunk;
      }
    }
    
    // Add the last chunk
    optimized.push(currentChunk);
    
    return optimized;
  }
}

/**
 * Specialized chunker for different content types
 */
class SpecializedChunker extends TextChunker {
  /**
   * Chunks markdown content preserving structure
   * @param {string} markdown - Markdown text
   * @param {Object} metadata - Document metadata
   * @returns {Array<Object>} Chunks with markdown structure preserved
   */
  chunkMarkdown(markdown, metadata = {}) {
    // Custom separators for markdown
    const markdownSeparators = [
      '\\n## ',      // H2 headers
      '\\n### ',     // H3 headers
      '\\n#### ',    // H4 headers
      '\\n\\n',      // Paragraphs
      '\\n- ',       // List items
      '\\n* ',       // List items
      '\\n1. ',      // Numbered lists
      '. ',          // Sentences
      ' '            // Words
    ];
    
    const originalSeparators = this.separators;
    this.separators = markdownSeparators;
    
    const chunks = this.chunkText(markdown, { ...metadata, contentType: 'markdown' });
    
    this.separators = originalSeparators;
    return chunks;
  }

  /**
   * Chunks code content preserving function boundaries
   * @param {string} code - Code text
   * @param {Object} metadata - Document metadata
   * @returns {Array<Object>} Chunks with code structure preserved
   */
  chunkCode(code, metadata = {}) {
    // Custom separators for code
    const codeSeparators = [
      '\\nclass ',        // Class definitions
      '\\nfunction ',     // Function definitions
      '\\nconst ',        // Const declarations
      '\\nlet ',          // Let declarations
      '\\nvar ',          // Var declarations
      '\\n\\n',           // Empty lines
      ';\\n',             // Statement endings
      '{\\n',             // Block openings
      '}\\n',             // Block closings
      '\\n'               // Lines
    ];
    
    const originalSeparators = this.separators;
    this.separators = codeSeparators;
    
    const chunks = this.chunkText(code, { ...metadata, contentType: 'code' });
    
    this.separators = originalSeparators;
    return chunks;
  }
}

module.exports = {
  TextChunker,
  SpecializedChunker
};