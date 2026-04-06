/**
 * Qdrant Vector Database Integration
 * Connects to Qdrant cloud instance and manages website embeddings
 */

const axios = require('axios');
const crypto = require('crypto');

class QdrantVectorDB {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://qdrant-opjq.onrender.com';
    this.apiKey = options.apiKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.g1hSyV4Fb14fjdEjE29DpkbMo6ZFI3wqStlryF3DJVY';
    this.collectionName = options.collectionName || 'website_data';
    this.vectorSize = options.vectorSize || 384; // SmolLM3-3B embedding dimension
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000;

    // Remove trailing slash from baseUrl
    this.baseUrl = this.baseUrl.replace(/\/$/, '');

    if (!this.apiKey) {
      throw new Error('Qdrant API key is required');
    }

    console.log(`🔗 Qdrant connection configured:`);
    console.log(`   🌐 URL: ${this.baseUrl}`);
    console.log(`   📦 Collection: ${this.collectionName}`);
    console.log(`   📏 Vector size: ${this.vectorSize}`);
  }

  /**
   * Get HTTP headers for Qdrant API requests
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make HTTP request to Qdrant with retry logic
   */
  async makeRequest(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 ${method.toUpperCase()} ${endpoint} (attempt ${attempt}/${this.maxRetries})`);

        const config = {
          method,
          url,
          headers: this.getHeaders(),
          timeout: 30000
        };

        if (data) {
          config.data = data;
        }

        const response = await axios(config);
        console.log(`✅ Request successful: ${response.status} ${response.statusText}`);
        return response.data;

      } catch (error) {
        console.error(`❌ Request attempt ${attempt} failed:`, error.message);

        if (error.response) {
          console.error(`   Status: ${error.response.status}`);
          console.error(`   Data:`, error.response.data);
        }

        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }

        if (attempt === this.maxRetries) {
          throw new Error(`Failed after ${this.maxRetries} attempts: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
  }

  /**
   * Check database health and connectivity
   */
  async checkHealth() {
    try {
      const startTime = Date.now();
      
      // Try to get cluster info to test connectivity
      const response = await this.makeRequest('GET', '/cluster');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        healthy: true,
        status: 'connected',
        responseTime: responseTime,
        cluster: response.data || 'unknown'
      };

    } catch (error) {
      return {
        healthy: false,
        status: 'disconnected',
        error: error.message,
        responseTime: null
      };
    }
  }

  /**
   * Check if collection exists
   */
  async collectionExists() {
    try {
      await this.makeRequest('GET', `/collections/${this.collectionName}`);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create collection with proper vector configuration
   */
  async createCollection() {
    console.log(`📦 Creating collection: ${this.collectionName}`);

    const collectionConfig = {
      vectors: {
        size: this.vectorSize,
        distance: 'Cosine'
      },
      optimizers_config: {
        default_segment_number: 2
      },
      replication_factor: 1
    };

    try {
      const response = await this.makeRequest('PUT', `/collections/${this.collectionName}`, collectionConfig);
      console.log(`✅ Collection created successfully`);
      return {
        success: true,
        collectionName: this.collectionName,
        vectorSize: this.vectorSize,
        response: response.data
      };
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`✅ Collection already exists`);
        return {
          success: true,
          collectionName: this.collectionName,
          vectorSize: this.vectorSize,
          status: 'exists'
        };
      }
      console.error(`❌ Failed to create collection:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Initialize collection (create if not exists)
   */
  async initializeCollection() {
    console.log(`🔍 Checking collection: ${this.collectionName}`);

    const exists = await this.collectionExists();
    
    if (!exists) {
      console.log(`📦 Collection doesn't exist, creating...`);
      await this.createCollection();
    } else {
      console.log(`✅ Collection exists: ${this.collectionName}`);
    }

    // Get collection info
    const info = await this.getCollectionInfo();
    console.log(`📊 Collection info:`);
    console.log(`   📏 Vector size: ${info.config?.params?.vectors?.size || 'unknown'}`);
    console.log(`   📈 Points count: ${info.points_count || 0}`);
    console.log(`   🎯 Distance metric: ${info.config?.params?.vectors?.distance || 'unknown'}`);

    return info;
  }

  /**
   * Get collection information
   */
  async getCollectionInfo() {
    try {
      const response = await this.makeRequest('GET', `/collections/${this.collectionName}`);
      
      if (response.data && response.data.result) {
        const result = response.data.result;
        
        return {
          success: true,
          status: result.status || 'unknown',
          vectorsCount: result.points_count || 0,
          indexedVectorsCount: result.indexed_vectors_count || 0,
          vectorSize: result.config?.params?.vectors?.size || this.vectorSize,
          distance: result.config?.params?.vectors?.distance || 'Cosine',
          config: result.config,
          raw: result
        };
      } else {
        return {
          success: false,
          error: 'Invalid response format'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if points with specific content hashes already exist
   */
  async checkExistingPoints(contentHashes) {
    if (!Array.isArray(contentHashes) || contentHashes.length === 0) {
      return [];
    }

    console.log(`🔍 Checking for ${contentHashes.length} existing points...`);

    try {
      // Search for points with matching content hashes
      const searchRequest = {
        filter: {
          must: [
            {
              key: 'contentHash',
              match: {
                any: contentHashes
              }
            }
          ]
        },
        limit: contentHashes.length,
        with_payload: true
      };

      const response = await this.makeRequest('POST', `/collections/${this.collectionName}/points/search`, {
        vector: new Array(this.vectorSize).fill(0), // Dummy vector for search
        ...searchRequest
      });

      const existingHashes = response.result?.map(point => point.payload?.contentHash).filter(Boolean) || [];
      console.log(`📊 Found ${existingHashes.length} existing points`);

      return existingHashes;

    } catch (error) {
      console.warn(`⚠️  Could not check existing points:`, error.message);
      return [];
    }
  }

  /**
   * Store single point in Qdrant
   */
  async storePoint(chunk) {
    if (!chunk.embedding || !Array.isArray(chunk.embedding)) {
      throw new Error('Valid embedding is required for storage');
    }

    if (chunk.embedding.length !== this.vectorSize) {
      throw new Error(`Embedding dimension (${chunk.embedding.length}) doesn't match collection size (${this.vectorSize})`);
    }

    const pointId = chunk.contentHash || this.generateId();
    
    const point = {
      id: pointId,
      vector: chunk.embedding,
      payload: {
        content: chunk.content,
        contentHash: chunk.contentHash,
        chunkIndex: chunk.chunkIndex,
        size: chunk.size,
        wordCount: chunk.wordCount,
        sourceUrl: chunk.sourceUrl,
        sourceTitle: chunk.sourceTitle,
        sourceDescription: chunk.sourceDescription,
        createdAt: chunk.createdAt,
        embeddingModel: chunk.embeddingModel,
        embeddingGeneratedAt: chunk.embeddingGeneratedAt,
        ...chunk.metadata
      }
    };

    const response = await this.makeRequest('PUT', `/collections/${this.collectionName}/points`, {
      points: [point]
    });

    return {
      pointId,
      status: response.status,
      operationId: response.operation_id
    };
  }

  /**
   * Store multiple points in batches
   */
  async storePoints(chunks, batchSize = 100) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      throw new Error('Array of chunks is required');
    }

    console.log(`💾 Storing ${chunks.length} points in Qdrant`);
    console.log(`📦 Batch size: ${batchSize}`);

    // Check for existing points to avoid duplicates
    const contentHashes = chunks.map(chunk => chunk.contentHash);
    const existingHashes = await this.checkExistingPoints(contentHashes);
    
    // Filter out existing chunks
    const newChunks = chunks.filter(chunk => !existingHashes.includes(chunk.contentHash));
    
    if (newChunks.length === 0) {
      console.log(`✅ All chunks already exist in database`);
      return {
        stored: 0,
        skipped: chunks.length,
        total: chunks.length,
        results: []
      };
    }

    console.log(`📊 Storing ${newChunks.length} new chunks (${existingHashes.length} already exist)`);

    const results = [];
    const errors = [];

    // Process in batches
    for (let i = 0; i < newChunks.length; i += batchSize) {
      const batch = newChunks.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(newChunks.length / batchSize);

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} points)`);

      try {
        const points = batch.map(chunk => {
          const pointId = chunk.pointId || chunk.contentHash || this.generateId();
          
          return {
            id: pointId,
            vector: chunk.embedding,
            payload: {
              content: chunk.content,
              contentHash: chunk.contentHash,
              chunkIndex: chunk.chunkIndex,
              size: chunk.size,
              wordCount: chunk.wordCount,
              sourceUrl: chunk.sourceUrl,
              sourceTitle: chunk.sourceTitle,
              sourceDescription: chunk.sourceDescription,
              createdAt: chunk.createdAt,
              embeddingModel: chunk.embeddingModel,
              embeddingGeneratedAt: chunk.embeddingGeneratedAt,
              ...chunk.metadata
            }
          };
        });

        const response = await this.makeRequest('PUT', `/collections/${this.collectionName}/points`, {
          points
        });

        results.push({
          batchNumber,
          pointsStored: batch.length,
          status: response.status,
          operationId: response.operation_id
        });

        console.log(`✅ Batch ${batchNumber} stored successfully`);

      } catch (error) {
        console.error(`❌ Batch ${batchNumber} failed:`, error.message);
        errors.push({
          batchNumber,
          error: error.message,
          pointsAffected: batch.length
        });
      }

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < newChunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const totalStored = results.reduce((sum, result) => sum + result.pointsStored, 0);
    const totalErrors = errors.reduce((sum, error) => sum + error.pointsAffected, 0);

    console.log(`📊 Storage complete:`);
    console.log(`   ✅ Stored: ${totalStored} points`);
    console.log(`   ⏭️  Skipped: ${existingHashes.length} points (duplicates)`);
    console.log(`   ❌ Failed: ${totalErrors} points`);

    return {
      stored: totalStored,
      skipped: existingHashes.length,
      failed: totalErrors,
      total: chunks.length,
      results,
      errors
    };
  }

  /**
   * Search for similar vectors
   */
  async searchSimilar(queryVector, limit = 10, minScore = 0.7) {
    if (!Array.isArray(queryVector) || queryVector.length !== this.vectorSize) {
      throw new Error(`Query vector must have ${this.vectorSize} dimensions`);
    }

    console.log(`🔍 Searching for similar vectors (limit: ${limit}, min score: ${minScore})`);

    const searchRequest = {
      vector: queryVector,
      limit,
      score_threshold: minScore,
      with_payload: true,
      with_vector: false
    };

    const response = await this.makeRequest('POST', `/collections/${this.collectionName}/points/search`, searchRequest);

    const results = response.result || [];
    console.log(`📊 Found ${results.length} similar vectors`);

    return results.map(result => ({
      id: result.id,
      score: result.score,
      content: result.payload?.content || result.payload?.text || '',
      sourceUrl: result.payload?.sourceUrl || '',
      sourceTitle: result.payload?.sourceTitle || '',
      chunkIndex: result.payload?.chunkIndex || 0,
      payload: result.payload,  // Keep full payload
      metadata: result.payload  // For compatibility
    }));
  }

  /**
   * Get collection statistics
   */
  async getStatistics() {
    try {
      const info = await this.getCollectionInfo();
      
      return {
        collectionName: this.collectionName,
        pointsCount: info.points_count || 0,
        vectorSize: info.config?.params?.vectors?.size || this.vectorSize,
        distanceMetric: info.config?.params?.vectors?.distance || 'Cosine',
        status: info.status || 'unknown',
        optimizerStatus: info.optimizer_status || 'unknown'
      };
    } catch (error) {
      console.error('❌ Failed to get statistics:', error.message);
      return {
        collectionName: this.collectionName,
        error: error.message
      };
    }
  }

  /**
   * Delete collection (use with caution)
   */
  async deleteCollection() {
    try {
      console.log(`⚠️  Deleting collection: ${this.collectionName}`);
      
      const response = await this.makeRequest('DELETE', `/collections/${this.collectionName}`);
      console.log(`✅ Collection deleted`);
      
      return {
        success: true,
        collectionName: this.collectionName,
        response: response.data
      };
    } catch (error) {
      console.error(`❌ Failed to delete collection:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test connection to Qdrant
   */
  async testConnection() {
    console.log(`🧪 Testing Qdrant connection...`);

    try {
      // Try to get collections list
      const response = await this.makeRequest('GET', '/collections');
      
      console.log(`✅ Connection successful`);
      console.log(`📊 Available collections: ${response.result?.collections?.length || 0}`);
      
      return {
        success: true,
        collections: response.result?.collections || [],
        status: 'connected'
      };

    } catch (error) {
      console.error(`❌ Connection test failed:`, error.message);
      return {
        success: false,
        error: error.message,
        status: 'disconnected'
      };
    }
  }

  /**
   * Generate unique ID for points (UUID format)
   */
  generateId() {
    return crypto.randomUUID();
  }

  /**
   * Clear all points from collection
   */
  async clearCollection() {
    console.log(`🧹 Clearing all points from collection: ${this.collectionName}`);
    
    const response = await this.makeRequest('POST', `/collections/${this.collectionName}/points/delete`, {
      filter: {}
    });
    
    console.log(`✅ Collection cleared`);
    return response;
  }

  /**
   * Insert multiple points into collection (alias for storePoints)
   */
  async insertPoints(points) {
    try {
      console.log(`📝 Inserting ${points.length} points into collection: ${this.collectionName}`);
      
      const startTime = Date.now();
      
      // Convert points to the format expected by Qdrant
      const qdrantPoints = points.map(point => {
        let pointId = point.id;
        
        // Convert string IDs to UUIDs for Qdrant compatibility
        if (typeof pointId === 'string' && !pointId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          pointId = this.generateId();
        } else if (!pointId) {
          pointId = this.generateId();
        }

        return {
          id: pointId,
          vector: point.vector,
          payload: {
            ...point.payload,
            originalId: point.id // Store original ID in payload
          }
        };
      });

      const response = await this.makeRequest('PUT', `/collections/${this.collectionName}/points`, {
        points: qdrantPoints
      });

      const endTime = Date.now();
      const operationTime = endTime - startTime;

      console.log(`✅ Successfully inserted ${points.length} points`);
      
      return {
        success: true,
        insertedCount: points.length,
        operationTime: operationTime,
        response: response.data,
        insertedPoints: qdrantPoints
      };

    } catch (error) {
      console.error(`❌ Failed to insert points:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a specific point by ID
   */
  async getPoint(pointId) {
    try {
      console.log(`🔍 Retrieving point: ${pointId}`);
      
      const response = await this.makeRequest('GET', `/collections/${this.collectionName}/points/${pointId}`);
      
      if (response.data && response.data.result) {
        console.log(`✅ Point retrieved successfully`);
        return {
          success: true,
          point: response.data.result
        };
      } else {
        return {
          success: false,
          error: 'Point not found'
        };
      }

    } catch (error) {
      console.error(`❌ Failed to retrieve point:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = QdrantVectorDB;