/**
 * Embedding Service
 * Handles text embedding generation and similarity search using Google Gemini embeddings
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

class EmbeddingService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embeddings = []; // Store embeddings in memory
    this.initialized = false;
  }

  /**
   * Generate embedding for a given text
   */
  async generateEmbedding(text) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "embedding-001" });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
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
   * Load and process all text files from the knowledge base
   */
  async loadKnowledgeBase() {
    try {
      if (process.env.ENABLE_EMBEDDINGS === 'false') {
        console.log('Embedding service disabled via ENABLE_EMBEDDINGS=false');
        this.initialized = true;
        this.embeddings = [];
        return;
      }

      const dataDir = path.join(__dirname, '../data/website_content');
      
      // Check if directory exists
      try {
        await fs.access(dataDir);
      } catch {
        console.warn(`Knowledge base directory not found: ${dataDir}`);
        this.initialized = true; // Mark as initialized even if no files
        return;
      }

      const files = await fs.readdir(dataDir);
      const txtFiles = files.filter(file => file.endsWith('.txt'));

      console.log(`\n📚 Loading ${txtFiles.length} knowledge base files...`);

      for (const file of txtFiles) {
        try {
          const filePath = path.join(dataDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          
          // Skip empty files
          if (!content.trim()) {
            console.log(`⚠️  Skipped: ${file} (empty)`);
            continue;
          }

          // Generate embedding for the content
          console.log(`   Processing: ${file}...`);
          const embedding = await this.generateEmbedding(content);
          
          this.embeddings.push({
            filename: file,
            content: content,
            embedding: embedding
          });

          console.log(`   ✅ Loaded: ${file}`);
          
          // Add delay to avoid rate limits (1 second between requests)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`   ❌ Error loading ${file}:`, error.message);
          // Continue with other files even if one fails
        }
      }

      this.initialized = true;
      console.log(`\n✨ Knowledge base initialized with ${this.embeddings.length} documents\n`);
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      this.initialized = true; // Mark as initialized to prevent hanging
      throw error;
    }
  }

  /**
   * Search for relevant context based on user query
   */
  async searchRelevantContext(query, topK = 3) {
    if (process.env.ENABLE_EMBEDDINGS === 'false') {
      return [];
    }

    if (!this.initialized) {
      await this.loadKnowledgeBase();
    }

    // If no embeddings available, return empty array
    if (this.embeddings.length === 0) {
      return [];
    }

    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);

    // Calculate similarity scores
    const results = this.embeddings.map(doc => ({
      ...doc,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // Sort by similarity and return top K results
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  /**
   * Get formatted context for GPT prompt
   */
  async getContextForPrompt(query) {
    const relevantDocs = await this.searchRelevantContext(query);
    
    if (relevantDocs.length === 0) {
      return '';
    }

    return relevantDocs
      .map((doc, index) => `[Source ${index + 1}: ${doc.filename}]\n${doc.content}`)
      .join('\n\n---\n\n');
  }
}

// Singleton instance
const embeddingService = new EmbeddingService();

module.exports = embeddingService;
