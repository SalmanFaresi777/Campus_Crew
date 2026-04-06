/**
 * HuggingFace Embedding Service
 * Generates embeddings using HuggingFace Inference API with SmolLM3-3B model
 */

const axios = require('axios');
const crypto = require('crypto');

class HuggingFaceEmbeddingService {
  constructor(options = {}) {
    this.apiToken = options.apiToken || process.env.HF_TOKEN;
    this.model = options.model || 'HuggingFaceTB/SmolLM3-3B:hf-inference';
    this.embeddingModel = options.embeddingModel || 'sentence-transformers/all-MiniLM-L6-v2';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000;
    this.batchSize = options.batchSize || 10;
    this.rateLimitDelay = options.rateLimitDelay || 1000;
    
    if (!this.apiToken) {
      throw new Error('HuggingFace API token is required');
    }

    // API endpoints
    this.embeddingEndpoint = `https://api-inference.huggingface.co/models/${this.embeddingModel}`;
    this.textGenerationEndpoint = `https://api-inference.huggingface.co/models/${this.model}`;
  }

  /**
   * Generate embeddings for a single text
   */
  async generateSingleEmbedding(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required for embedding generation');
    }

    const cleanText = text.trim();
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Generating embedding (attempt ${attempt}/${this.maxRetries}): ${cleanText.substring(0, 50)}...`);

        const response = await axios.post(
          this.embeddingEndpoint,
          { 
            inputs: cleanText,
            options: {
              wait_for_model: true
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000
          }
        );

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const embedding = response.data;
          console.log(`✅ Generated embedding: ${embedding.length} dimensions`);
          
          return {
            text: cleanText,
            embedding: embedding,
            dimensions: embedding.length,
            model: this.embeddingModel,
            generatedAt: new Date().toISOString()
          };
        } else {
          throw new Error('Invalid embedding response format');
        }

      } catch (error) {
        console.error(`❌ Embedding attempt ${attempt} failed:`, error.message);

        // Handle rate limiting
        if (error.response?.status === 429) {
          const waitTime = this.retryDelay * attempt;
          console.log(`⏳ Rate limited. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // Handle model loading
        if (error.response?.data?.error?.includes('loading')) {
          const waitTime = 20000; // Wait 20 seconds for model to load
          console.log(`🤖 Model loading. Waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (attempt === this.maxRetries) {
          throw new Error(`Failed to generate embedding after ${this.maxRetries} attempts: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  /**
   * Generate embeddings for multiple texts with batching
   */
  async generateEmbeddings(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Array of texts is required');
    }

    console.log(`🚀 Generating embeddings for ${texts.length} texts using ${this.embeddingModel}`);
    console.log(`📦 Batch size: ${this.batchSize}, Rate limit delay: ${this.rateLimitDelay}ms`);

    const embeddings = [];
    const errors = [];

    // Process in batches to avoid rate limiting
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(texts.length / this.batchSize);

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);

      for (let j = 0; j < batch.length; j++) {
        const text = batch[j];
        const textIndex = i + j;

        try {
          const embeddingResult = await this.generateSingleEmbedding(text);
          embeddings.push({
            index: textIndex,
            ...embeddingResult
          });

          console.log(`✅ Embedding ${textIndex + 1}/${texts.length} completed`);

        } catch (error) {
          console.error(`❌ Failed to generate embedding for text ${textIndex + 1}:`, error.message);
          errors.push({
            index: textIndex,
            text: text.substring(0, 100) + '...',
            error: error.message
          });
        }

        // Add delay between individual requests to avoid rate limiting
        if (j < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }
      }

      // Add longer delay between batches
      if (i + this.batchSize < texts.length) {
        const batchDelay = this.rateLimitDelay * 2;
        console.log(`⏸️  Waiting ${batchDelay}ms between batches...`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    console.log(`📊 Embedding generation complete:`);
    console.log(`   ✅ Successful: ${embeddings.length}/${texts.length}`);
    console.log(`   ❌ Failed: ${errors.length}/${texts.length}`);

    if (errors.length > 0) {
      console.log(`⚠️  Errors encountered:`);
      errors.slice(0, 3).forEach(error => {
        console.log(`   ${error.index}: ${error.error}`);
      });
      if (errors.length > 3) {
        console.log(`   ... and ${errors.length - 3} more errors`);
      }
    }

    return {
      embeddings,
      errors,
      statistics: {
        total: texts.length,
        successful: embeddings.length,
        failed: errors.length,
        successRate: Math.round((embeddings.length / texts.length) * 100),
        averageDimensions: embeddings.length > 0 ? embeddings[0].dimensions : 0,
        model: this.embeddingModel
      }
    };
  }

  /**
   * Generate embeddings for chunks with metadata preservation
   */
  async generateChunkEmbeddings(chunks) {
    if (!Array.isArray(chunks)) {
      throw new Error('Chunks array is required');
    }

    console.log(`🧠 Generating embeddings for ${chunks.length} chunks`);

    const texts = chunks.map(chunk => chunk.content);
    const embeddingResults = await this.generateEmbeddings(texts);

    // Combine embeddings with chunk metadata
    const enrichedChunks = [];

    for (const embeddingResult of embeddingResults.embeddings) {
      const originalChunk = chunks[embeddingResult.index];
      
      enrichedChunks.push({
        ...originalChunk,
        embedding: embeddingResult.embedding,
        embeddingDimensions: embeddingResult.dimensions,
        embeddingModel: embeddingResult.model,
        embeddingGeneratedAt: embeddingResult.generatedAt
      });
    }

    console.log(`✅ Generated embeddings for ${enrichedChunks.length} chunks`);

    return {
      chunks: enrichedChunks,
      statistics: embeddingResults.statistics,
      errors: embeddingResults.errors
    };
  }

  /**
   * Test model availability and performance
   */
  async testModel() {
    console.log(`🧪 Testing HuggingFace model: ${this.embeddingModel}`);

    const testTexts = [
      'This is a test sentence for embedding generation.',
      'CampusCrew is a platform for managing campus events.',
      'Users can create, join, and manage events through the dashboard.'
    ];

    try {
      const startTime = Date.now();
      const results = await this.generateEmbeddings(testTexts);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const avgTimePerEmbedding = totalTime / results.embeddings.length;

      console.log(`✅ Model test completed:`);
      console.log(`   📊 Total time: ${totalTime}ms`);
      console.log(`   ⚡ Average time per embedding: ${Math.round(avgTimePerEmbedding)}ms`);
      console.log(`   📏 Embedding dimensions: ${results.statistics.averageDimensions}`);
      console.log(`   ✅ Success rate: ${results.statistics.successRate}%`);

      return {
        success: true,
        performance: {
          totalTime,
          avgTimePerEmbedding,
          dimensions: results.statistics.averageDimensions,
          successRate: results.statistics.successRate
        }
      };

    } catch (error) {
      console.error(`❌ Model test failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate similarity between two embeddings
   */
  calculateSimilarity(embedding1, embedding2) {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
      throw new Error('Invalid embeddings for similarity calculation');
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return Math.max(-1, Math.min(1, similarity)); // Clamp to [-1, 1]
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
      avgMagnitude: embeddings.reduce((sum, emb) => {
        return sum + Math.sqrt(emb.reduce((s, val) => s + val * val, 0));
      }, 0) / embeddings.length
    };
  }
}

module.exports = HuggingFaceEmbeddingService;