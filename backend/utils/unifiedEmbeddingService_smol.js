/**
 * Unified Embedding Service
 * Uses Cohere's embed-english-light-v3.0 for generating embeddings from text chunks
 * Supports batch processing, rate limiting, and error handling
 */

const CohereEmbeddingService = require('./cohereEmbeddingService');

class UnifiedEmbeddingService {
  constructor(options = {}) {
    this.apiKey = options.apiKey || options.apiToken || process.env.COHERE_API_KEY;
    this.model = options.model || process.env.COHERE_EMBEDDING_MODEL || 'embed-english-light-v3.0';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000;
    this.batchSize = options.batchSize || 96;
    this.rateLimitDelay = options.rateLimitDelay || 1000;
    
    if (!this.apiKey) {
      throw new Error('Cohere API key is required (COHERE_API_KEY in .env)');
    }

    // Initialize Cohere embedding service
    this.embeddingService = new CohereEmbeddingService({
      apiKey: this.apiKey,
      model: this.model,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      batchSize: this.batchSize
    });
    
    console.log('🤖 Unified Embedding Service initialized with Cohere');
    console.log(`   🔗 Model: ${this.model}`);
  }

  /**
   * Generate embedding for a single text using SmolLM3-3B
   */
  async generateSingleEmbedding(text) {
    return await this.embeddingService.generateSingleEmbedding(text);
  }

  /**
   * Generate embeddings for multiple texts with batching
   */
  async generateEmbeddings(texts) {
    return await this.embeddingService.generateEmbeddings(texts);
  }

  /**
   * Generate embeddings for chunks with metadata preservation
   */
  async generateChunkEmbeddings(chunks) {
    return await this.embeddingService.generateChunkEmbeddings(chunks);
  }

  /**
   * Calculate similarity between two embeddings
   */
  calculateSimilarity(embedding1, embedding2) {
    return this.embeddingService.calculateSimilarity(embedding1, embedding2);
  }

  /**
   * Test the embedding service
   */
  async testModel() {
    return await this.embeddingService.testModel();
  }

  /**
   * Get embedding statistics
   */
  getEmbeddingStats(embeddings) {
    if (!Array.isArray(embeddings) || embeddings.length === 0) {
      return { count: 0 };
    }

    const dimensions = embeddings[0].length;
    const means = new Array(dimensions).fill(0);
    const stds = new Array(dimensions).fill(0);

    // Calculate means
    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        means[i] += embedding[i];
      }
    }
    for (let i = 0; i < dimensions; i++) {
      means[i] /= embeddings.length;
    }

    // Calculate standard deviations
    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        stds[i] += Math.pow(embedding[i] - means[i], 2);
      }
    }
    for (let i = 0; i < dimensions; i++) {
      stds[i] = Math.sqrt(stds[i] / embeddings.length);
    }

    return {
      count: embeddings.length,
      dimensions,
      meanVector: means,
      stdVector: stds,
      avgMagnitude: means.reduce((sum, val) => sum + Math.abs(val), 0) / dimensions,
      avgStd: stds.reduce((sum, val) => sum + val, 0) / dimensions
    };
  }

  /**
   * Create similarity matrix for a set of embeddings
   */
  createSimilarityMatrix(embeddings) {
    const n = embeddings.length;
    const matrix = Array(n).fill().map(() => Array(n));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else if (i < j) {
          matrix[i][j] = this.calculateSimilarity(embeddings[i], embeddings[j]);
          matrix[j][i] = matrix[i][j]; // Symmetric
        }
      }
    }

    return matrix;
  }

  /**
   * Find most similar embedding to a query embedding
   */
  findMostSimilar(queryEmbedding, candidateEmbeddings, topK = 5) {
    const similarities = candidateEmbeddings.map((embedding, index) => ({
      index,
      embedding,
      similarity: this.calculateSimilarity(queryEmbedding, embedding)
    }));

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, topK);
  }
}

module.exports = UnifiedEmbeddingService;