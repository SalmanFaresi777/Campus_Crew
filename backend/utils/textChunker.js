/**
 * Text Chunking Module
 * Splits text content into optimally sized chunks for embedding generation
 */

const crypto = require('crypto');

class TextChunker {
  constructor(options = {}) {
    this.minChunkSize = options.minChunkSize || 500;
    this.maxChunkSize = options.maxChunkSize || 800;
    this.overlap = options.overlap || 50;
    this.preserveStructure = options.preserveStructure !== false;
  }

  /**
   * Split text into sentences while preserving structure
   */
  splitIntoSentences(text) {
    // More sophisticated sentence splitting that handles common abbreviations
    const abbreviations = new Set([
      'Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Sr', 'Jr', 'Inc', 'Ltd', 'Co', 'Corp',
      'vs', 'etc', 'i.e', 'e.g', 'al', 'cf', 'approx', 'min', 'max', 'avg'
    ]);

    // Split on sentence boundaries but be careful with abbreviations
    const sentences = [];
    let current = '';
    const chars = text.split('');
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      current += char;
      
      if (char === '.' || char === '!' || char === '?') {
        // Look ahead to see if this is likely end of sentence
        const nextChar = chars[i + 1];
        const prevWord = current.trim().split(/\s+/).pop().replace(/[.!?]$/, '');
        
        // Check if this is an abbreviation
        if (abbreviations.has(prevWord)) {
          continue;
        }
        
        // If next character is lowercase or digit, probably not end of sentence
        if (nextChar && /[a-z0-9]/.test(nextChar)) {
          continue;
        }
        
        // This looks like end of sentence
        if (current.trim().length > 0) {
          sentences.push(current.trim());
          current = '';
        }
      }
    }
    
    // Add remaining text as last sentence
    if (current.trim().length > 0) {
      sentences.push(current.trim());
    }
    
    return sentences.filter(s => s.length > 0);
  }

  /**
   * Split text into words with whitespace preservation info
   */
  splitIntoWords(text) {
    const words = [];
    const matches = text.matchAll(/\S+|\s+/g);
    
    for (const match of matches) {
      words.push(match[0]);
    }
    
    return words;
  }

  /**
   * Create chunks with optimal size and word boundaries
   */
  createOptimalChunks(text, metadata = {}) {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const sentences = this.splitIntoSentences(text);
    const chunks = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

      // If adding this sentence would exceed max size, finalize current chunk
      if (potentialChunk.length > this.maxChunkSize && currentChunk.length >= this.minChunkSize) {
        chunks.push(this.createChunkObject(currentChunk, chunkIndex, metadata));
        chunkIndex++;
        
        // Start new chunk with overlap from previous chunk
        if (this.overlap > 0) {
          const words = this.splitIntoWords(currentChunk);
          const overlapWords = words.slice(-Math.ceil(this.overlap / 5)); // Rough word estimate
          currentChunk = overlapWords.join('').trim();
        } else {
          currentChunk = '';
        }
        
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        currentChunk = potentialChunk;
      }

      // If chunk is getting too large, force split even mid-sentence
      if (currentChunk.length > this.maxChunkSize) {
        const forceSplit = this.forceSplitLargeChunk(currentChunk);
        
        for (let j = 0; j < forceSplit.length - 1; j++) {
          chunks.push(this.createChunkObject(forceSplit[j], chunkIndex, metadata));
          chunkIndex++;
        }
        
        currentChunk = forceSplit[forceSplit.length - 1];
      }
    }

    // Add remaining content as final chunk
    if (currentChunk.trim().length >= this.minChunkSize) {
      chunks.push(this.createChunkObject(currentChunk, chunkIndex, metadata));
    } else if (chunks.length > 0) {
      // If remaining content is too small, append to last chunk
      chunks[chunks.length - 1].content += ' ' + currentChunk.trim();
      chunks[chunks.length - 1].contentHash = this.generateContentHash(chunks[chunks.length - 1].content);
    }

    return chunks;
  }

  /**
   * Force split chunks that are too large
   */
  forceSplitLargeChunk(text) {
    const words = this.splitIntoWords(text);
    const chunks = [];
    let currentChunk = '';

    for (const word of words) {
      const potentialChunk = currentChunk + word;
      
      if (potentialChunk.length > this.maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk = potentialChunk;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Create chunk object with metadata
   */
  createChunkObject(content, index, sourceMetadata = {}) {
    const cleanContent = content.trim();
    
    return {
      content: cleanContent,
      contentHash: this.generateContentHash(cleanContent),
      chunkIndex: index,
      size: cleanContent.length,
      wordCount: cleanContent.split(/\s+/).length,
      sourceUrl: sourceMetadata.url || '',
      sourceTitle: sourceMetadata.title || '',
      sourceDescription: sourceMetadata.description || '',
      createdAt: new Date().toISOString(),
      metadata: {
        ...sourceMetadata,
        chunkIndex: index,
        size: cleanContent.length,
        wordCount: cleanContent.split(/\s+/).length
      }
    };
  }

  /**
   * Generate content hash for duplicate detection
   */
  generateContentHash(content) {
    return crypto.createHash('sha256')
      .update(content.trim().toLowerCase())
      .digest('hex');
  }

  /**
   * Process multiple pages and create chunks
   */
  processPages(pages) {
    const allChunks = [];
    
    console.log(`📝 Processing ${pages.length} pages for chunking...`);

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      if (!page.content || page.content.length < 50) {
        console.log(`⚠️  Skipping page ${i + 1}: Content too short (${page.content?.length || 0} chars)`);
        continue;
      }

      console.log(`📄 Chunking page ${i + 1}/${pages.length}: ${page.title} (${page.content.length} chars)`);

      const pageChunks = this.createOptimalChunks(page.content, {
        url: page.url,
        title: page.title,
        description: page.description,
        scrapedAt: page.scrapedAt,
        pageIndex: i
      });

      allChunks.push(...pageChunks);
      
      console.log(`✅ Created ${pageChunks.length} chunks from page: ${page.title}`);
    }

    console.log(`📊 Total chunks created: ${allChunks.length}`);
    console.log(`📏 Average chunk size: ${Math.round(allChunks.reduce((sum, chunk) => sum + chunk.size, 0) / allChunks.length)} characters`);

    return allChunks;
  }

  /**
   * Remove duplicate chunks based on content hash
   */
  removeDuplicates(chunks) {
    const seen = new Set();
    const unique = [];

    for (const chunk of chunks) {
      if (!seen.has(chunk.contentHash)) {
        seen.add(chunk.contentHash);
        unique.push(chunk);
      }
    }

    const duplicatesRemoved = chunks.length - unique.length;
    if (duplicatesRemoved > 0) {
      console.log(`🗑️  Removed ${duplicatesRemoved} duplicate chunks`);
    }

    return unique;
  }

  /**
   * Get chunking statistics
   */
  getStatistics(chunks) {
    if (chunks.length === 0) {
      return { 
        totalChunks: 0, 
        averageSize: 0, 
        totalSize: 0,
        minSize: 0,
        maxSize: 0,
        averageWordCount: 0,
        sizeDistribution: {
          small: 0,
          optimal: 0,
          large: 0
        }
      };
    }

    const sizes = chunks.map(chunk => chunk.size);
    const wordCounts = chunks.map(chunk => chunk.wordCount);

    return {
      totalChunks: chunks.length,
      totalSize: sizes.reduce((sum, size) => sum + size, 0),
      averageSize: Math.round(sizes.reduce((sum, size) => sum + size, 0) / sizes.length),
      minSize: Math.min(...sizes),
      maxSize: Math.max(...sizes),
      averageWordCount: Math.round(wordCounts.reduce((sum, count) => sum + count, 0) / wordCounts.length),
      sizeDistribution: {
        small: sizes.filter(s => s < this.minChunkSize).length,
        optimal: sizes.filter(s => s >= this.minChunkSize && s <= this.maxChunkSize).length,
        large: sizes.filter(s => s > this.maxChunkSize).length
      }
    };
  }
}

module.exports = TextChunker;