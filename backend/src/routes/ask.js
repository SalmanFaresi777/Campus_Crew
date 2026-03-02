/**
 * RAG Ask Route
 * Handles question-answering using retrieval-augmented generation
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const axios = require('axios');

/**
 * RAG Query Handler
 */
class RAGQueryHandler {
  constructor() {
    this.vectorDb = null;
    this.embeddingService = null;
    this.llmService = null;
    
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize embedding service (same as ingest worker)
      if (config.OPENAI_API_KEY) {
        this.embeddingService = new OpenAIEmbeddingService();
        this.llmService = new OpenAILLMService();
      } else {
        this.embeddingService = new HuggingFaceEmbeddingService();
        this.llmService = new HuggingFaceLLMService();
      }

      // Initialize vector database
      if (config.VECTOR_DB_TYPE === 'pinecone' && config.PINECONE_API_KEY) {
        this.vectorDb = new PineconeQueryService();
      } else {
        this.vectorDb = new QdrantQueryService();
      }
      
      await this.vectorDb.initialize();
      console.log('🔍 RAG query handler initialized');
      
    } catch (error) {
      console.error('❌ RAG initialization failed:', error.message);
      // Use mock services for development
      this.embeddingService = new MockEmbeddingService();
      this.vectorDb = new MockVectorQueryService();
      this.llmService = new MockLLMService();
      console.log('🧪 Using mock RAG services');
    }
  }

  /**
   * Processes a question using RAG pipeline
   * @param {string} question - User question
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Response with answer and sources
   */
  async processQuery(question, context = {}) {
    try {
      console.log(`🔍 Processing query: "${question}"`);

      // Step 1: Generate embedding for the question
      const queryEmbedding = await this.embeddingService.createEmbeddings([question]);
      
      // Step 2: Retrieve relevant documents
      const retrievedDocs = await this.vectorDb.searchSimilar(
        queryEmbedding[0],
        config.MAX_RETRIEVED_DOCS,
        config.SIMILARITY_THRESHOLD
      );

      console.log(`📚 Retrieved ${retrievedDocs.length} relevant documents`);

      // Step 3: Prepare context for LLM
      const ragContext = this.prepareContext(retrievedDocs, context);

      // Step 4: Generate answer using LLM
      const answer = await this.llmService.generateAnswer(question, ragContext);

      // Step 5: Prepare response
      const response = {
        answer: answer.text,
        confidence: answer.confidence || 0.8,
        sources: retrievedDocs.map(doc => ({
          id: doc.id,
          title: doc.metadata.title || 'Untitled',
          url: doc.metadata.url,
          relevanceScore: doc.score,
          snippet: this.extractSnippet(doc.metadata.text, question)
        })),
        metadata: {
          retrievedDocs: retrievedDocs.length,
          processingTime: Date.now() - context.startTime,
          model: answer.model || 'unknown'
        }
      };

      console.log(`✅ Generated answer with ${response.sources.length} sources`);
      return response;

    } catch (error) {
      console.error('❌ RAG query failed:', error.message);
      throw error;
    }
  }

  /**
   * Prepares context string for LLM from retrieved documents
   * @param {Array} documents - Retrieved documents
   * @param {Object} additionalContext - Additional context
   * @returns {string} Formatted context
   */
  prepareContext(documents, additionalContext = {}) {
    let context = '';

    // Add retrieved documents
    if (documents.length > 0) {
      context += 'Based on the following information:\\n\\n';
      
      documents.forEach((doc, index) => {
        const title = doc.metadata.title || `Document ${index + 1}`;
        const text = doc.metadata.text || '';
        const snippet = text.length > 500 ? text.substring(0, 500) + '...' : text;
        
        context += `**${title}**\\n${snippet}\\n\\n`;
      });
    }

    // Add live data if available (from existing chatbot context)
    if (additionalContext.liveData) {
      context += 'Current event information:\\n';
      context += additionalContext.liveData + '\\n\\n';
    }

    // Add instructions
    context += `Instructions:
- Answer the user's question based on the provided information
- Be specific and helpful
- If information is not available in the context, say so clearly
- Include relevant details like dates, locations, fees when available
- Keep the answer concise but complete`;

    return context;
  }

  /**
   * Extracts a relevant snippet from document text
   * @param {string} text - Document text
   * @param {string} question - User question
   * @returns {string} Relevant snippet
   */
  extractSnippet(text, question) {
    if (!text) return '';
    
    const questionWords = question.toLowerCase().split(/\\s+/)
      .filter(word => word.length > 3)
      .slice(0, 3); // Top 3 meaningful words
    
    // Find best matching sentence
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    let bestSentence = sentences[0] || text;
    let maxMatches = 0;
    
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const matches = questionWords.filter(word => sentenceLower.includes(word)).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestSentence = sentence;
      }
    }
    
    // Return snippet around best sentence
    const maxLength = 200;
    if (bestSentence.length <= maxLength) {
      return bestSentence.trim();
    }
    
    return bestSentence.substring(0, maxLength).trim() + '...';
  }
}

// Initialize RAG handler
const ragHandler = new RAGQueryHandler();

/**
 * POST /api/ask
 * Main RAG endpoint for question answering
 */
router.post('/ask', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { question, context: additionalContext = {} } = req.body;

    // Validate input
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Question is required and must be a non-empty string'
      });
    }

    // Rate limiting (basic)
    // TODO: Implement proper rate limiting with Redis

    // Process query
    const response = await ragHandler.processQuery(
      question.trim(),
      { ...additionalContext, startTime }
    );

    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Ask endpoint error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your question',
      details: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ask/health
 * Health check for RAG system
 */
router.get('/ask/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      vectorDb: ragHandler.vectorDb ? 'connected' : 'disconnected',
      embeddingService: ragHandler.embeddingService ? 'available' : 'unavailable',
      llmService: ragHandler.llmService ? 'available' : 'unavailable',
      timestamp: new Date().toISOString()
    };

    // Quick health check
    if (ragHandler.vectorDb && ragHandler.vectorDb.healthCheck) {
      health.vectorDbHealth = await ragHandler.vectorDb.healthCheck();
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Service Classes (similar to ingest worker but for querying)

class OpenAIEmbeddingService {
  constructor() {
    this.apiKey = config.OPENAI_API_KEY;
    this.model = config.EMBEDDING_MODEL;
  }

  async createEmbeddings(texts) {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      { model: this.model, input: texts },
      { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
    );
    return response.data.data.map(item => item.embedding);
  }
}

class HuggingFaceEmbeddingService {
  constructor() {
    this.apiKey = config.HF_TOKEN;
    this.model = 'sentence-transformers/all-MiniLM-L6-v2';
  }

  async createEmbeddings(texts) {
    const embeddings = [];
    for (const text of texts) {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${this.model}`,
        { inputs: text },
        { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
      );
      embeddings.push(response.data);
    }
    return embeddings;
  }
}

class MockEmbeddingService {
  async createEmbeddings(texts) {
    return texts.map(() => Array.from({ length: 384 }, () => Math.random() - 0.5));
  }
}

class QdrantQueryService {
  constructor() {
    this.url = config.QDRANT_URL;
    this.apiKey = config.QDRANT_API_KEY;
    this.collection = config.QDRANT_COLLECTION;
  }

  async initialize() {
    // Test connection
    try {
      const headers = {};
      if (this.apiKey) headers['api-key'] = this.apiKey;
      await axios.get(`${this.url}/collections/${this.collection}`, { headers });
    } catch (error) {
      console.log('⚠️ Qdrant connection test failed:', error.message);
    }
  }

  async searchSimilar(vector, limit = 5, threshold = 0.7) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers['api-key'] = this.apiKey;

      const response = await axios.post(
        `${this.url}/collections/${this.collection}/points/search`,
        {
          vector,
          limit,
          score_threshold: threshold,
          with_payload: true
        },
        { headers }
      );

      return response.data.result.map(item => ({
        id: item.id,
        score: item.score,
        metadata: item.payload
      }));
    } catch (error) {
      console.error('❌ Qdrant search failed:', error.message);
      return [];
    }
  }

  async healthCheck() {
    try {
      const headers = {};
      if (this.apiKey) headers['api-key'] = this.apiKey;
      await axios.get(`${this.url}/health`, { headers });
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }
}

class PineconeQueryService {
  async initialize() {
    console.log('🌲 Pinecone query service - TODO: Implement');
  }

  async searchSimilar(vector, limit = 5, threshold = 0.7) {
    console.log('🌲 Pinecone search - TODO: Implement');
    return [];
  }
}

class MockVectorQueryService {
  constructor() {
    this.mockDocs = [
      {
        id: 'mock-1',
        score: 0.9,
        metadata: {
          title: 'CampusCrew Features',
          text: 'CampusCrew is an event management platform that helps organize campus events...',
          url: 'https://campuscrew.com/features'
        }
      }
    ];
  }

  async initialize() {
    console.log('🧪 Mock vector query service initialized');
  }

  async searchSimilar(vector, limit = 5) {
    return this.mockDocs.slice(0, limit);
  }
}

// LLM Services

class OpenAILLMService {
  constructor() {
    this.apiKey = config.OPENAI_API_KEY;
    this.model = config.OPENAI_MODEL;
  }

  async generateAnswer(question, context) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: question }
        ],
        max_tokens: 500,
        temperature: 0.3
      },
      { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
    );

    return {
      text: response.data.choices[0].message.content,
      model: this.model,
      confidence: 0.8
    };
  }
}

class HuggingFaceLLMService {
  constructor() {
    this.apiKey = config.HF_TOKEN;
    this.model = config.HF_MODEL;
  }

  async generateAnswer(question, context) {
    const prompt = `${context}\\n\\nQuestion: ${question}\\nAnswer:`;
    
    const response = await axios.post(
      'https://router.huggingface.co/v1/chat/completions',
      {
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: question }
        ],
        model: this.model,
        max_tokens: 300,
        temperature: 0.3
      },
      { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
    );

    let text = response.data.choices[0].message.content;
    // Clean up response
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return {
      text,
      model: this.model,
      confidence: 0.7
    };
  }
}

class MockLLMService {
  async generateAnswer(question, context) {
    return {
      text: `This is a mock answer for: "${question}". In a real implementation, this would be generated by an LLM using the provided context.`,
      model: 'mock-llm',
      confidence: 0.5
    };
  }
}

module.exports = router;