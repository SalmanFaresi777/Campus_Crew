/**
 * Cohere Embedding Service
 * Uses Cohere's embed-english-light-v3.0 model for generating embeddings
 * Optimized for semantic search and retrieval
 */

const axios = require('axios');

class CohereEmbeddingService {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.COHERE_API_KEY;
    this.model = options.model || process.env.COHERE_EMBEDDING_MODEL || 'embed-english-light-v3.0';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000;
    this.batchSize = options.batchSize || 96; // Cohere supports up to 96 texts per request
    this.inputType = options.inputType || 'search_document'; // or 'search_query'
    
    if (!this.apiKey) {
      throw new Error('Cohere API key is required');
    }

    // API endpoint
    this.apiEndpoint = 'https://api.cohere.ai/v1/embed';
    
    console.log('🤖 Cohere Embedding Service initialized');
    console.log(`   🔗 Model: ${this.model}`);
    console.log(`   📦 Batch size: ${this.batchSize}`);
  }

  /**
   * Generate embedding for a single text using Cohere API
   */
  async generateSingleEmbedding(text, inputType = null) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required for embedding generation');
    }

    const cleanText = text.trim();
    const type = inputType || this.inputType;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Generating Cohere embedding (attempt ${attempt}/${this.maxRetries}): ${cleanText.substring(0, 50)}...`);

        const response = await axios.post(
          this.apiEndpoint,
          {
            texts: [cleanText],
            model: this.model,
            input_type: type,
            truncate: 'END' // Truncate from end if text is too long
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000
          }
        );

        if (response.data && response.data.embeddings && response.data.embeddings.length > 0) {
          const embedding = response.data.embeddings[0];
          console.log(`✅ Generated Cohere embedding: ${embedding.length} dimensions`);
          
          return {
            text: cleanText,
            embedding: embedding,
            dimensions: embedding.length,
            model: this.model,
            provider: 'cohere',
            inputType: type
          };
        }

        throw new Error('Invalid response from Cohere API');

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.response?.data || error.message);
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt;
          console.log(`   ⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw new Error(`Failed to generate embedding after ${this.maxRetries} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * Generate embeddings for multiple texts with batching
   */
  async generateEmbeddings(texts, inputType = null) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Array of texts is required');
    }

    const type = inputType || this.inputType;
    const results = [];
    
    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const cleanBatch = batch.map(t => t.trim()).filter(t => t.length > 0);
      
      if (cleanBatch.length === 0) continue;

      console.log(`📦 Processing batch ${Math.floor(i / this.batchSize) + 1}: ${cleanBatch.length} texts`);

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const response = await axios.post(
            this.apiEndpoint,
            {
              texts: cleanBatch,
              model: this.model,
              input_type: type,
              truncate: 'END'
            },
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 60000
            }
          );

          if (response.data && response.data.embeddings) {
            const embeddings = response.data.embeddings.map((emb, idx) => ({
              text: cleanBatch[idx],
              embedding: emb,
              dimensions: emb.length,
              model: this.model,
              provider: 'cohere',
              inputType: type
            }));

            results.push(...embeddings);
            console.log(`✅ Generated ${embeddings.length} embeddings`);
            break; // Success, exit retry loop
          }

        } catch (error) {
          console.error(`❌ Batch attempt ${attempt} failed:`, error.response?.data || error.message);
          
          if (attempt < this.maxRetries) {
            const delay = this.retryDelay * attempt;
            console.log(`   ⏳ Retrying batch in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw new Error(`Failed to generate batch embeddings after ${this.maxRetries} attempts`);
          }
        }
      }

      // Rate limiting delay between batches
      if (i + this.batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Generate embeddings for chunks with metadata preservation
   */
  async generateChunkEmbeddings(chunks) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      throw new Error('Array of chunks is required');
    }

    console.log(`\n🔄 Generating embeddings for ${chunks.length} chunks...`);
    
    const texts = chunks.map(chunk => chunk.text || chunk.content || '');
    const embeddings = await this.generateEmbeddings(texts);

    // Combine embeddings with original chunk metadata
    return chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index].embedding,
      dimensions: embeddings[index].dimensions,
      model: embeddings[index].model,
      provider: embeddings[index].provider
    }));
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1, embedding2) {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
      throw new Error('Invalid embeddings for similarity calculation');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Find most similar texts from a corpus
   */
  async findMostSimilar(query, candidateTexts, topK = 5) {
    console.log(`🔍 Finding ${topK} most similar texts to query...`);
    
    // Generate query embedding with 'search_query' type
    const queryResult = await this.generateSingleEmbedding(query, 'search_query');
    
    // Generate candidate embeddings with 'search_document' type
    const candidateResults = await this.generateEmbeddings(candidateTexts, 'search_document');
    
    // Calculate similarities
    const similarities = candidateResults.map((result, index) => ({
      text: result.text,
      index: index,
      similarity: this.calculateSimilarity(queryResult.embedding, result.embedding)
    }));

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, topK);
  }

  /**
   * Test the embedding service
   */
  async testModel() {
    console.log(`\n🧪 Testing Cohere Embedding Service with ${this.model}...`);
    
    try {
      const testText = "Hello, this is a test message for Cohere embeddings.";
      const result = await this.generateSingleEmbedding(testText, 'search_document');
      
      console.log('✅ Embedding generation successful!');
      console.log(`📏 Embedding dimensions: ${result.dimensions}`);
      console.log(`📊 Sample values: [${result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
      console.log(`🔧 Model: ${result.model}`);
      console.log(`🏢 Provider: ${result.provider}`);
      
      return true;
    } catch (error) {
      console.log('❌ Embedding test failed:', error.message);
      return false;
    }
  }
}

module.exports = CohereEmbeddingService;

// Test if run directly
if (require.main === module) {
  const service = new CohereEmbeddingService();
  service.testModel().then(() => {
    console.log('\n✨ Test complete');
  }).catch(error => {
    console.error('Test error:', error);
  });
}
