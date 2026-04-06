/**
 * Monitored Vector Database Service
 * Wraps your vector database operations with comprehensive monitoring
 * Shows exactly when and how your chatbot uses the vector database
 */

const QdrantVectorDB = require('./qdrantVectorDB');
const UnifiedEmbeddingService = require('./unifiedEmbeddingService_smol');
const vectorMonitor = require('./vectorDatabaseMonitor');

class MonitoredVectorService {
  constructor(options = {}) {
    this.vectorDB = new QdrantVectorDB({
      baseUrl: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: options.collectionName || 'campuscrew_docs',
      vectorSize: 384
    });

    this.embeddingService = new UnifiedEmbeddingService({
      apiKey: process.env.COHERE_API_KEY,
      model: process.env.COHERE_EMBEDDING_MODEL
    });

    this.enabled = process.env.RAG_ENABLED === 'true';
    this.minSimilarity = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.3;
    this.maxDocs = parseInt(process.env.MAX_RETRIEVED_DOCS) || 5;

    console.log('🔍 Monitored Vector Service initialized');
    console.log(`   📊 Monitoring enabled: YES`);
    console.log(`   🎯 RAG enabled: ${this.enabled}`);
    console.log(`   📏 Min similarity: ${this.minSimilarity}`);
    console.log(`   📄 Max documents: ${this.maxDocs}`);
  }

  /**
   * Search for relevant documents with full monitoring
   */
  async searchRelevantDocuments(query, userId = 'unknown') {
    if (!this.enabled) {
      await vectorMonitor.trackFallback('RAG disabled in config', 'keyword_search');
      return { success: false, reason: 'RAG disabled', documents: [] };
    }

    try {
      console.log('\n🔍 Vector Database Search Initiated');
      console.log(`   🔎 Query: "${query}"`);
      console.log(`   👤 User: ${userId}`);

      const startTime = Date.now();

      // Generate embedding for the query
      console.log('🧠 Generating query embedding...');
      const embeddingResult = await this.embeddingService.generateSingleEmbedding(query);
      
      if (!embeddingResult || !embeddingResult.embedding) {
        await vectorMonitor.trackFallback('Embedding generation failed', 'keyword_search');
        return { success: false, reason: 'Embedding failed', documents: [] };
      }

      console.log(`   ✅ Embedding generated (${embeddingResult.dimensions}D, ${embeddingResult.provider})`);

      // Search vector database
      console.log('🔍 Searching vector database...');
      const searchResults = await this.vectorDB.searchSimilar(
        embeddingResult.embedding,
        this.maxDocs,
        this.minSimilarity
      );

      const endTime = Date.now();
      const searchTime = endTime - startTime;

      // searchSimilar returns an array directly, not {success, results}
      if (Array.isArray(searchResults) && searchResults.length > 0) {
        // Track successful vector search
        await vectorMonitor.trackVectorSearch(
          query,
          searchTime,
          searchResults,
          embeddingResult.model
        );

        console.log(`   ✅ Found ${searchResults.length} relevant documents`);
        searchResults.forEach((result, index) => {
          console.log(`      ${index + 1}. Score: ${result.score.toFixed(4)} | ${result.metadata?.content?.substring(0, 60) || result.content?.substring(0, 60)}...`);
        });

        return {
          success: true,
          documents: searchResults,
          searchTime,
          embeddingModel: embeddingResult.model,
          queryEmbedding: embeddingResult.embedding
        };

      } else {
        await vectorMonitor.trackVectorSearch(query, searchTime, [], embeddingResult.model);
        console.log('   ⚠️  No relevant documents found in vector database');
        
        return {
          success: true,
          documents: [],
          searchTime,
          reason: 'No similar documents found'
        };
      }

    } catch (error) {
      console.error('❌ Vector search failed:', error.message);
      await vectorMonitor.trackFallback(`Vector search error: ${error.message}`, 'keyword_search');
      
      return {
        success: false,
        error: error.message,
        documents: []
      };
    }
  }

  /**
   * Build context from retrieved documents
   */
  buildContext(documents, maxLength = 2000) {
    if (!documents || documents.length === 0) {
      return '';
    }

    let context = 'Relevant information from CampusCrew platform:\n\n';
    let currentLength = context.length;

    for (const doc of documents) {
      const content = doc.payload?.content || '';
      if (currentLength + content.length > maxLength) {
        break;
      }
      
      context += `• ${content}\n`;
      currentLength += content.length + 2;
    }

    return context.trim();
  }

  /**
   * Complete RAG pipeline for chatbot integration
   */
  async performRAGSearch(userQuery, userId = 'unknown') {
    console.log('\n🚀 Starting RAG Pipeline');
    
    // Track the user query
    await vectorMonitor.trackQuery(userQuery, userId);

    // Search for relevant documents
    const searchResult = await this.searchRelevantDocuments(userQuery, userId);

    let ragContext = '';
    let documentsUsed = 0;

    if (searchResult.success && searchResult.documents.length > 0) {
      ragContext = this.buildContext(searchResult.documents);
      documentsUsed = searchResult.documents.length;

      console.log('📄 RAG Context Built:');
      console.log(`   📊 Documents used: ${documentsUsed}`);
      console.log(`   📏 Context length: ${ragContext.length} characters`);
      console.log(`   ⏱️  Total search time: ${searchResult.searchTime}ms`);
    } else {
      console.log('⚠️  No RAG context available');
      console.log(`   Reason: ${searchResult.reason || 'Unknown'}`);
    }

    return {
      hasContext: ragContext.length > 0,
      context: ragContext,
      documentsFound: documentsUsed,
      searchTime: searchResult.searchTime || 0,
      embeddingModel: searchResult.embeddingModel || 'none',
      vectorDatabaseUsed: searchResult.success && searchResult.documents.length > 0
    };
  }

  /**
   * Track when RAG context is actually used in response
   */
  async trackContextUsage(ragContext, generatedResponse) {
    await vectorMonitor.trackRAGUsage(ragContext, generatedResponse, this.enabled);
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    return vectorMonitor.getSessionStats();
  }

  /**
   * Print monitoring dashboard
   */
  printDashboard() {
    vectorMonitor.printDashboard();
  }

  /**
   * Store new documents in vector database
   */
  async storeDocuments(documents) {
    if (!this.enabled) {
      console.log('⚠️  Vector storage disabled (RAG_ENABLED=false)');
      return { success: false, reason: 'RAG disabled' };
    }

    try {
      console.log(`📚 Storing ${documents.length} documents in vector database...`);
      
      // Generate embeddings for documents
      const texts = documents.map(doc => doc.content);
      const embeddingResults = await this.embeddingService.generateEmbeddings(texts);

      if (embeddingResults.embeddings.length === 0) {
        console.log('❌ No embeddings generated for documents');
        return { success: false, reason: 'Embedding generation failed' };
      }

      // Prepare points for storage
      const points = embeddingResults.embeddings.map((embResult, index) => {
        const originalDoc = documents[embResult.index];
        return {
          id: originalDoc.id || `doc_${Date.now()}_${index}`,
          vector: embResult.embedding,
          payload: {
            content: originalDoc.content,
            source: originalDoc.source || 'unknown',
            title: originalDoc.title || '',
            url: originalDoc.url || '',
            metadata: originalDoc.metadata || {},
            storedAt: new Date().toISOString()
          }
        };
      });

      // Store in vector database
      const storeResult = await this.vectorDB.insertPoints(points);

      if (storeResult.success) {
        console.log(`✅ Successfully stored ${storeResult.insertedCount} documents`);
        console.log(`   ⏱️  Storage time: ${storeResult.operationTime}ms`);
        
        await vectorMonitor.log('DOCUMENT_STORAGE', 'Documents stored in vector database', {
          documentsStored: storeResult.insertedCount,
          storageTime: storeResult.operationTime,
          embeddingModel: embeddingResults.statistics.model
        });

        return {
          success: true,
          storedCount: storeResult.insertedCount,
          storageTime: storeResult.operationTime
        };
      } else {
        console.log('❌ Failed to store documents');
        return { success: false, reason: storeResult.error };
      }

    } catch (error) {
      console.error('❌ Document storage failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test the vector database connection and functionality
   */
  async testConnection() {
    console.log('🧪 Testing vector database connection...');
    
    try {
      const health = await this.vectorDB.checkHealth();
      
      if (health.healthy) {
        console.log(`✅ Vector database connected (${health.responseTime}ms)`);
        
        await vectorMonitor.log('CONNECTION_TEST', 'Vector database connection successful', {
          responseTime: health.responseTime,
          status: health.status
        });
        
        return { success: true, responseTime: health.responseTime };
      } else {
        console.log('❌ Vector database connection failed');
        return { success: false, error: health.error };
      }
    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = MonitoredVectorService;