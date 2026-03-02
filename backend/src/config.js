/**
 * Configuration file for RAG pipeline
 * Reads environment variables and provides default values
 */

const config = {
  // Server Configuration
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || process.env.mongo_uri || 'mongodb://localhost:27017/campuscrew',
  
  // Vector Database Configuration
  VECTOR_DB_TYPE: process.env.VECTOR_DB_TYPE || 'qdrant', // 'qdrant' or 'pinecone'
  
  // Qdrant Configuration
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  QDRANT_API_KEY: process.env.QDRANT_API_KEY || null,
  QDRANT_COLLECTION: process.env.QDRANT_COLLECTION || 'campuscrew_docs',
  
  // Pinecone Configuration (Alternative)
  PINECONE_API_KEY: process.env.PINECONE_API_KEY || null,
  PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp',
  PINECONE_INDEX: process.env.PINECONE_INDEX || 'campuscrew-docs',
  
  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || null,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
  
  // Hugging Face Configuration (Current setup)
  HF_TOKEN: process.env.HF_TOKEN,
  HF_MODEL: process.env.HF_MODEL || 'HuggingFaceTB/SmolLM3-3B:hf-inference',
  HF_EMBEDDING_MODEL: process.env.HF_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
  
  // Embedding Configuration
  EMBEDDING_DIMENSION: parseInt(process.env.EMBEDDING_DIMENSION) || 384, // HuggingFace sentence-transformers default
  
  // RAG Configuration
  CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE) || 1000,
  CHUNK_OVERLAP: parseInt(process.env.CHUNK_OVERLAP) || 200,
  MAX_RETRIEVED_DOCS: parseInt(process.env.MAX_RETRIEVED_DOCS) || 5,
  SIMILARITY_THRESHOLD: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.7,
  
  // Scraping Configuration
  SCRAPE_URLS: process.env.SCRAPE_URLS ? process.env.SCRAPE_URLS.split(',') : [
    'https://campuscrew.com/about',
    'https://campuscrew.com/features',
    'https://campuscrew.com/how-to-use'
  ],
  SCRAPE_INTERVAL: parseInt(process.env.SCRAPE_INTERVAL) || 24 * 60 * 60 * 1000, // 24 hours
  
  // File Watching Configuration
  WATCH_DIRECTORIES: process.env.WATCH_DIRECTORIES ? process.env.WATCH_DIRECTORIES.split(',') : [
    './data/website_content',
    './data/documents'
  ],
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60,
  
  // Feature Flags
  ENABLE_FEEDBACK: process.env.ENABLE_FEEDBACK !== 'false',
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS !== 'false',
  ENABLE_CACHING: process.env.ENABLE_CACHING !== 'false',
  
  // Cache Configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 60 * 60, // 1 hour
};

/**
 * Validates required environment variables
 * @returns {Object} Validation result with missing keys
 */
function validateConfig() {
  const required = [];
  const recommended = [];
  const optional = [];
  
  // Check vector database configuration
  if (config.VECTOR_DB_TYPE === 'pinecone') {
    if (!config.PINECONE_API_KEY) required.push('PINECONE_API_KEY');
    if (!config.PINECONE_ENVIRONMENT) recommended.push('PINECONE_ENVIRONMENT');
  } else if (config.VECTOR_DB_TYPE === 'qdrant') {
    if (!config.QDRANT_URL) recommended.push('QDRANT_URL');
    optional.push('QDRANT_API_KEY (if using Qdrant Cloud)');
  }
  
  // Check AI service configuration
  if (!config.HF_TOKEN && !config.OPENAI_API_KEY) {
    required.push('HF_TOKEN or OPENAI_API_KEY');
  }
  
  // Check database
  if (!config.MONGODB_URI) required.push('MONGODB_URI or mongo_uri');
  
  return {
    isValid: required.length === 0,
    required,
    recommended,
    optional
  };
}

/**
 * Gets the current configuration summary
 * @returns {Object} Configuration summary
 */
function getConfigSummary() {
  return {
    vectorDB: config.VECTOR_DB_TYPE,
    aiProvider: config.HF_TOKEN ? 'HuggingFace' : config.OPENAI_API_KEY ? 'OpenAI' : 'None',
    database: config.MONGODB_URI ? 'Configured' : 'Missing',
    features: {
      feedback: config.ENABLE_FEEDBACK,
      analytics: config.ENABLE_ANALYTICS,
      caching: config.ENABLE_CACHING
    }
  };
}

module.exports = {
  ...config,
  validateConfig,
  getConfigSummary
};
