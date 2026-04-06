/**
 * Hugging Face Embedding Service
 * Uses sentence-transformers models for generating embeddings
 */

require('dotenv').config();
const axios = require('axios');

class HuggingFaceEmbeddingService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.embeddingModel = process.env.HF_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
  }

  /**
   * Generate embeddings for text using sentence-transformers
   */
  async generateEmbedding(text) {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.embeddingModel}`,
        {
          inputs: text,
          options: { wait_for_model: true }
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data;
    } catch (error) {
      console.error('Hugging Face embedding error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find most similar text from a list
   */
  async findMostSimilar(query, textList) {
    try {
      // Generate embeddings for query and all texts
      const queryEmbedding = await this.generateEmbedding(query);
      const textEmbeddings = await Promise.all(
        textList.map(text => this.generateEmbedding(text))
      );

      // Calculate similarities
      const similarities = textEmbeddings.map((embedding, index) => ({
        text: textList[index],
        similarity: this.cosineSimilarity(queryEmbedding, embedding),
        index
      }));

      // Sort by similarity (highest first)
      return similarities.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.error('Similarity search error:', error);
      return [];
    }
  }

  /**
   * Test the embedding service
   */
  async test() {
    console.log(`🧪 Testing Hugging Face Embedding Service with ${this.embeddingModel}...`);
    
    try {
      const testText = "Hello, this is a test message.";
      const embedding = await this.generateEmbedding(testText);
      
      console.log('✅ Embedding generation successful!');
      console.log(`📏 Embedding dimensions: ${Array.isArray(embedding) ? embedding.length : 'Unknown'}`);
      console.log(`📊 Sample values: [${embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}...]`);
      
      return true;
    } catch (error) {
      console.log('❌ Embedding test failed:', error.message);
      return false;
    }
  }
}

module.exports = HuggingFaceEmbeddingService;

// Test if run directly
if (require.main === module) {
  const service = new HuggingFaceEmbeddingService();
  service.test();
}