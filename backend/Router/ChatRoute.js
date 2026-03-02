/**
 * Chat Route - Simplified Architecture
 * Handles chatbot API endpoints with:
 * - AI Intent Classification (intelligent query routing)
 * - Qdrant Vector Database (semantic search for general questions)
 * - MongoDB integration (live event data)
 * - Simple keyword fallback (reliability)
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const MonitoredVectorService = require('../utils/monitoredVectorService'); // Qdrant vector search
const dbTools = require('../utils/dbTools');
const intentClassifier = require('../utils/intentClassifier'); // AI Intent Classification
const eventQueryHandler = require('../utils/eventQueryHandler'); // Event Query Processing
const conversationMemory = require('../utils/conversationMemory'); // Conversation Memory
const path = require('path');
const fs = require('fs').promises;

// Initialize Qdrant vector service
const qdrantService = new MonitoredVectorService({
  collectionName: process.env.QDRANT_COLLECTION || 'campuscrew_docs'
});

// ChatAnywhere GPT API configuration (OpenAI-compatible)
const CHATANYWHERE_API_KEY = process.env.CHATANYWHERE_API_KEY;
const CHATANYWHERE_MODEL = process.env.CHATANYWHERE_MODEL || 'gpt-5-mini';
const CHATANYWHERE_MAX_TOKENS = Number(process.env.CHATANYWHERE_MAX_OUTPUT_TOKENS) || 2048;
const CHATANYWHERE_BASE_URL = process.env.CHATANYWHERE_BASE_URL || 'https://api.chatanywhere.tech/v1';
const CHATANYWHERE_API_URL = `${CHATANYWHERE_BASE_URL}/chat/completions`;
const FRONTEND_BASE_URL = (process.env.frontend_url || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

function unique(arr) { return Array.from(new Set(arr.filter(Boolean))); }

// Detect if the user is asking for a specific attribute (concise answer mode)
function detectAttributeQuery(text) {
  const t = (text || '').toLowerCase();
  const checks = [
    { key: 'fee', re: /(registration\s*)?(fee|cost|price|entry(?:\s*fee)?|ticket(?:\s*price)?)/i },
    { key: 'prize', re: /(prize(?:\s*money)?|reward|winnings|price\s*money)/i },
    { key: 'deadline', re: /(registration\s*)?(last\s*date|final\s*date|deadline|close\s*date|end\s*date)/i },
  ];
  for (const c of checks) {
    if (c.re.test(t)) return c.key;
  }
  return null;
}

// Using ChatAnywhere GPT API for LLM responses (OpenAI-compatible)

/**
 * Simple context retrieval without embeddings
 * Uses keyword matching from knowledge base files
 */
async function getSimpleContext(query) {
  try {
    const dataDir = path.join(__dirname, '../data/website_content');
    const files = await fs.readdir(dataDir);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    
    const queryLower = query.toLowerCase();
    const cleanedQuery = queryLower.replace(/[^a-z0-9\s]/g, ' ');
    let keywords = cleanedQuery.split(/\s+/).filter(w => w.length > 2);

    // Special handling for contact-related queries
    const isContactQuery = /\b(contact|address|phone|email|location|reach|call)\b/i.test(queryLower);
    if (isContactQuery) {
      console.log('🎯 Detected contact query - prioritizing contact.txt');
      try {
        const contactPath = path.join(dataDir, 'contact.txt');
        const contactContent = await fs.readFile(contactPath, 'utf-8');
        // Return contact.txt as highest priority
        return contactContent;
      } catch (err) {
        console.log('⚠️  contact.txt not found, continuing with keyword search');
      }
    }

    if (keywords.length === 0 && queryLower.includes('campuscrew')) {
      keywords = ['campuscrew'];
    }
    
    let bestMatches = [];
    
    for (const file of txtFiles) {
      const content = await fs.readFile(path.join(dataDir, file), 'utf-8');
      const contentLower = content.toLowerCase();
      
      // Count keyword matches
      let score = 0;
      for (const keyword of keywords) {
        const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
        score += matches;
      }
      
      // Boost score if it's contact.txt and query contains contact keywords
      if (file === 'contact.txt' && isContactQuery) {
        score += 1000; // High boost
      }
      
      if (score > 0) {
        bestMatches.push({ file, content, score });
      }
    }
    
    // Sort by score and take top 3
    bestMatches.sort((a, b) => b.score - a.score);
    const topMatches = bestMatches.slice(0, 3);
    
    if (topMatches.length > 0) {
      return topMatches.map(m => m.content.substring(0, 1500)).join('\n\n---\n\n');
    }

    // Fallback to general overview content if no keyword matches
    try {
      const homePath = path.join(dataDir, 'home.txt');
      const defaultContent = await fs.readFile(homePath, 'utf-8');
      return defaultContent.substring(0, 1500);
    } catch (_) {
      // ignore and fall through
    }
    
    return null;
  } catch (error) {
    console.error('Simple context error:', error.message);
    return null;
  }
}

// Simple in-memory per-IP rate limiter to reduce upstream 429s
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT = Number(process.env.CHAT_RATE_LIMIT_PER_MIN || 10);
const rateMap = new Map(); // ip -> { count, resetAt }

function isAllowed(ip) {
  const now = Date.now();
  const rec = rateMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > rec.resetAt) {
    rec.count = 0;
    rec.resetAt = now + RATE_WINDOW_MS;
  }
  if (rec.count >= RATE_LIMIT) {
    return false;
  }
  rec.count += 1;
  rateMap.set(ip, rec);
  return true;
}

/**
 * POST /chat
 * Process user message and return bot response
 * Now with database integration and advanced context retrieval
 */
router.post('/chat', async (req, res) => {
  try {
    // Basic rate limiting per IP to avoid upstream quota spikes
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    if (!isAllowed(ip)) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please slow down and try again in a minute.'
      });
    }
    const { message, conversationHistory = [], userId } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    // Generate user ID if not provided (for anonymous users)
    const effectiveUserId = userId || ip; // Use IP as fallback for user identification

    // Add user message to conversation memory
    conversationMemory.addMessage(effectiveUserId, 'user', message, {
      ip,
      timestamp: Date.now(),
      userAgent: req.headers['user-agent']
    });

    // Get conversation context for enhanced responses
    const memoryContext = conversationMemory.getConversationContext(effectiveUserId);
    const conversationSummary = conversationMemory.getConversationSummary(effectiveUserId);

    console.log(`💭 User ${effectiveUserId}: "${message}" | 🤖 Model: ${CHATANYWHERE_MODEL} | 📊 History: ${conversationSummary?.messageCount || 1} messages`);

    // Validate ChatAnywhere API token
    if (!CHATANYWHERE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'ChatAnywhere API token not configured. Please add CHATANYWHERE_API_KEY to your .env file'
      });
    }

    // ===== STEP 1: CLASSIFY USER INTENT =====
    // Use AI-powered intent classification to understand what the user wants
    const intentResult = intentClassifier.classifyIntent(message);
    const responseStrategy = intentClassifier.getResponseStrategy(intentResult);
    
    console.log(`🎯 Intent: ${intentResult.intent} (${(intentResult.confidence * 100).toFixed(1)}% confidence)`);
    console.log(`📋 Strategy: ${responseStrategy.type}`, responseStrategy);

    // ===== STEP 2: HANDLE DIFFERENT INTENTS =====
    let liveData = null;
    
    // Handle greetings with simple responses
    if (intentResult.intent === 'GREETING') {
      const greetings = {
        hi: `� **Hello!** Welcome to CampusCrew!\n\nI'm here to help you discover amazing events on campus. You can ask me about:\n- Upcoming events\n- Specific event details\n- Events by category (Cultural, Career, Sports, etc.)\n- Platform statistics\n\nWhat would you like to know?`,
        thanks: `You're very welcome! 😊\n\nIf you need anything else about our events or platform, feel free to ask!`,
        bye: `Goodbye! 👋\n\nCome back anytime to explore events on CampusCrew. Have a great day!`
      };
      
      const messageLower = message.toLowerCase();
      let greetingResponse = greetings.hi; // default
      
      if (/^(thanks|thank\s*you|ty|thx)/.test(messageLower)) {
        greetingResponse = greetings.thanks;
      } else if (/^(bye|goodbye|see\s*you|later|cya)/.test(messageLower)) {
        greetingResponse = greetings.bye;
      }
      
      conversationMemory.addMessage(effectiveUserId, 'assistant', greetingResponse, {
        model: 'intent-greeting',
        timestamp: Date.now()
      });
      
      return res.json({
        success: true,
        response: greetingResponse,
        model: 'intent-greeting',
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle database queries (events, stats, etc.)
    if (responseStrategy.useDatabase) {
      console.log('� Processing database query...');
      
      liveData = await eventQueryHandler.handleEventQuery(
        intentResult,
        responseStrategy,
        FRONTEND_BASE_URL
      );
      
      if (liveData) {
        console.log('✅ Successfully generated event response from database');
        
        // Add to conversation memory
        conversationMemory.addMessage(effectiveUserId, 'assistant', liveData, {
          model: 'live-db',
          intent: intentResult.intent,
          timestamp: Date.now()
        });
        
        // Return database response directly
        return res.json({
          success: true,
          response: liveData,
          model: 'live-db',
          intent: intentResult.intent,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('⚠️ Database query returned no results, falling back to RAG...');
        // Fall through to RAG processing below
      }
    }

    // ===== STEP 3: Simplified context retrieval - Qdrant + Simple Fallback =====
    let context = '';
    let vectorSearchUsed = false;
    let searchMetadata = {};
    
    // Check if this is a contact-related query
    const isContactQuery = /\b(contact|address|phone|email|location|reach|call)\b/i.test(message);
    
    try {
      // Primary: Qdrant Vector Database (semantic search)
      console.log('🔍 Searching Qdrant vector database...');
      const qdrantResults = await qdrantService.searchRelevantDocuments(message, effectiveUserId);
      
      if (qdrantResults.success && qdrantResults.documents.length > 0) {
        console.log(`✅ Qdrant found ${qdrantResults.documents.length} relevant documents`);
        
        // Check if contact document is in results
        const hasContactDoc = qdrantResults.documents.some(doc => 
          (doc.payload?.source || '').toLowerCase().includes('contact')
        );
        
        // If this is a contact query but contact.txt is not in top results, force include it
        if (isContactQuery && !hasContactDoc) {
          console.log('🎯 Contact query detected but contact.txt not in results - adding keyword fallback');
          const keywordContext = await getSimpleContext(message);
          if (keywordContext) {
            context = keywordContext;
            console.log('✅ Using keyword-based context for contact query');
          }
        }
        
        // If we don't have context yet, use Qdrant results
        if (!context) {
          // Format context from Qdrant results
          context = qdrantResults.documents
            .map((doc, index) => {
              const score = (doc.score * 100).toFixed(1);
              const content = doc.payload.content || '';
              const source = doc.payload.source || doc.payload.title || 'Document';
              return `[Source ${index + 1}: ${source} (Relevance: ${score}%)]\n${content.substring(0, 1500)}`;
            })
            .join('\n\n---\n\n');
          
          vectorSearchUsed = true;
          searchMetadata = {
            searchTime: qdrantResults.searchTime,
            documentsFound: qdrantResults.documents.length,
            embeddingModel: qdrantResults.embeddingModel
          };
        }
        
        console.log(`📊 Context retrieved: ${context.length} characters from ${qdrantResults.documents.length} sources`);
      } else {
        console.log('⚠️ Qdrant returned no relevant documents, falling back to keyword search...');
        throw new Error('No relevant documents found in vector database');
      }
      
    } catch (qdrantError) {
      // Fallback: Simple keyword search (always reliable)
      console.log('📚 Using simple keyword search fallback');
      console.log(`   Reason: ${qdrantError.message}`);
      
      try {
        context = await getSimpleContext(message);
        if (context) {
          console.log(`✅ Keyword search found context: ${context.length} characters`);
        }
      } catch (fallbackError) {
        console.error('❌ Keyword search also failed:', fallbackError.message);
      }
    }

    // Final fallback message if no context found
    if (!context) {
      context = 'I have access to information about CampusCrew, but I\'m having trouble retrieving it right now. Please try asking about specific features, events, or contact information.';
      console.log('⚠️ No context retrieved from any source');
    }

    // Step 3: Build conversation history text
    const recentHistory = conversationHistory.slice(-5);
    let conversationText = '';
    
    for (const msg of recentHistory) {
      conversationText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    }

    // Step 4: Build the full prompt for Hugging Face Chat API
    const fullPrompt = `You are a helpful assistant for CampusCrew, an event management platform. 
Your role is to answer questions about the website, its features, and help users navigate the platform.

Use the following information from the website's knowledge base to answer questions:

${context}

${liveData ? `IMPORTANT - Here is LIVE, REAL-TIME data from the database. Use this for the most accurate, up-to-date information:${liveData}` : ''}

If the information needed to answer the question is not in the provided context, politely inform the user and suggest they contact support or explore the website. Keep responses friendly, concise, and helpful.

${conversationText ? `Previous conversation:\n${conversationText}\n` : ''}
User: ${message}
Assistant:`;

    // Step 5: Call ChatAnywhere GPT API
    let botResponse;
    let usedModel = CHATANYWHERE_MODEL;
    let lastErr;

    // Helper function to call ChatAnywhere GPT API (OpenAI-compatible)
    async function query(data) {
      const response = await axios.post(
        CHATANYWHERE_API_URL,
        data,
        {
          headers: {
            Authorization: `Bearer ${CHATANYWHERE_API_KEY}`,
            "Content-Type": "application/json",
          }
        }
      );
      return response.data;
    }

    try {
      console.log(`🤖 Using ChatAnywhere GPT model: ${CHATANYWHERE_MODEL}`);
      
      const result = await query({
        messages: [
          {
            role: "system",
            content: `You are a specialized customer support assistant EXCLUSIVELY for CampusCrew, an event management platform. 

🚫 CRITICAL RESTRICTIONS:
- You can ONLY answer questions about CampusCrew platform, its features, events, and services
- You MUST refuse to answer ANY question unrelated to CampusCrew (e.g., cooking, general knowledge, other topics)
- If asked about unrelated topics, politely say: "I'm sorry, but I can only assist with questions about CampusCrew platform and its events. Please ask me about CampusCrew features, events, registration, or how to use the platform."

✅ TOPICS YOU CAN HELP WITH:
- CampusCrew platform features and how to use them
- Event browsing, registration, and management
- Account creation and profile management
- Event categories (Sports, Cultural, Academic, etc.)
- Certificates, payments, and registration process
- Platform navigation and troubleshooting
- Contact information and support (address, phone, email)
- About CampusCrew, team information, and platform details

IMPORTANT: Questions about CampusCrew's address, phone number, email, contact information, team members, or "about us" information ARE CAMPUSCREW-RELATED and should be answered using the context provided below.

Use the following information from the website's knowledge base to answer questions:

${context}

${vectorSearchUsed && searchMetadata.documentsFound > 0 ? `
🔍 VECTOR DATABASE CONTEXT:
This information was retrieved using semantic search from ${searchMetadata.documentsFound} relevant sources.
Search completed in ${searchMetadata.searchTime}ms.
` : ''}

${liveData ? `IMPORTANT - Here is LIVE, REAL-TIME data from the database. Use this for the most accurate, up-to-date information:${liveData}` : ''}

${memoryContext ? `
💭 CONVERSATION MEMORY:
${memoryContext}

IMPORTANT: Use this conversation history to provide contextual responses. If the user refers to "it", "that", "the event I mentioned", or similar references, look at the conversation history to understand what they're referring to. Maintain conversation continuity and acknowledge previous topics when relevant.
` : ''}

${conversationSummary && conversationSummary.messageCount > 1 ? `
📊 CONVERSATION SUMMARY: This user has sent ${conversationSummary.messageCount} messages. Topics discussed: ${conversationSummary.topics.join(', ') || 'general questions'}. Conversation duration: ${Math.round(conversationSummary.duration / 60000)} minutes.
` : ''}

If the question is about CampusCrew but the information is not in the provided context, politely inform the user and suggest they contact support at campuscrew@gmail.com or explore the website. Keep responses friendly, concise, and helpful. Use conversation history to provide more personalized and contextual responses.

REMEMBER: NEVER answer questions unrelated to CampusCrew!`
          },
          {
            role: "user",
            content: message
          }
        ],
        model: CHATANYWHERE_MODEL,
        max_tokens: CHATANYWHERE_MAX_TOKENS,
        temperature: 0.7,
        top_p: 0.9
      });

      if (result.choices && result.choices.length > 0) {
        botResponse = result.choices[0].message.content;
        
        // Clean up unwanted model artifacts from responses
        if (botResponse) {
          // Remove <think>...</think> tags and content
          botResponse = botResponse.replace(/<think>[\s\S]*?<\/think>/gi, '');
          // Remove standalone <think> or </think> tags
          botResponse = botResponse.replace(/<\/?think>/gi, '');
          // Clean up extra whitespace
          botResponse = botResponse.replace(/^\s+|\s+$/g, '').replace(/\n\s*\n\s*\n/g, '\n\n');
          // If response is empty after cleaning, provide a fallback
          if (!botResponse.trim()) {
            botResponse = "I'd be happy to help you with information about CampusCrew events. Could you please rephrase your question?";
          }
        }
        
        usedModel = CHATANYWHERE_MODEL;
        console.log(`✅ Successfully got response from ${usedModel}`);
      } else if (result.error) {
        throw new Error(result.error.message || 'API returned error');
      } else {
        throw new Error('No response received from API');
      }
    } catch (err) {
      lastErr = err;
      console.error('ChatAnywhere API error:', err.message);
    }

    if (!botResponse && lastErr) {
      // Enhanced fallback with basic keyword-based responses
      const messageLower = message.toLowerCase();
      const upcomingUrl = `${FRONTEND_BASE_URL}/upcoming-events`;
      let fallbackText;

      if (/\b(sport|sports|football|cricket|badminton|basketball|soccer|volleyball|tennis|athletic|e-?sports)\b/i.test(message)) {
        fallbackText = `🏆 **Sports Events**\n\nI'm having trouble with my AI models right now, but I can help you find sports events! Visit ${upcomingUrl} and search for "Sports" to see all available athletic activities.`;
      } else if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
        fallbackText = `👋 **Hello there!**\n\nWelcome to CampusCrew! I'm having some technical difficulties with my AI models, but I'm still here to help. You can:\n\n• Browse upcoming events: ${upcomingUrl}\n• Create your own events\n• Join interesting activities\n\nWhat would you like to explore?`;
      } else if (messageLower.includes('event') || messageLower.includes('activity')) {
        fallbackText = `📅 **Events & Activities**\n\nI'm currently having AI model issues, but you can still explore all our amazing events! Check out ${upcomingUrl} to see what's happening on campus.`;
      } else {
        fallbackText = `🤖 **CampusCrew Assistant**\n\nI'm experiencing some technical difficulties with my AI models right now. While I work on getting back to full capacity, feel free to:\n\n• Explore events: ${upcomingUrl}\n• Contact support if you need immediate help\n\nSorry for the inconvenience!`;
      }

      return res.json({
        success: true,
        response: fallbackText,
        model: 'local-fallback',
        timestamp: new Date().toISOString()
      });
    }

    // Add assistant response to conversation memory
    conversationMemory.addMessage(effectiveUserId, 'assistant', botResponse, {
      model: usedModel,
      vectorSearch: vectorSearchUsed ? searchMetadata : null,
      timestamp: Date.now()
    });

    // Return response
    res.json({
      success: true,
      response: botResponse,
      model: usedModel,
      timestamp: new Date().toISOString(),
      metadata: {
        vectorSearchUsed,
        searchTime: searchMetadata.searchTime,
        documentsFound: searchMetadata.documentsFound
      },
      conversationInfo: {
        messageCount: conversationSummary?.messageCount || 1,
        topics: conversationSummary?.topics || [],
        hasMemory: !!memoryContext
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    // Handle specific Hugging Face errors
    if (error.message?.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'Invalid Hugging Face API key'
      });
    }
    
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your message'
    });
  }
});

/**
 * GET /chat/health
 * Check if chat service is ready
 */
router.get('/chat/health', async (req, res) => {
  try {
    const hasToken = !!CHATANYWHERE_API_KEY;
    const configuredModel = CHATANYWHERE_MODEL;
    
    // Check Qdrant connection
    let qdrantStatus = { healthy: false, error: 'Not tested' };
    try {
      qdrantStatus = await qdrantService.testConnection();
    } catch (error) {
      qdrantStatus = { healthy: false, error: error.message };
    }
    
    res.json({
      success: true,
      status: hasToken && qdrantStatus.healthy ? 'ready' : 'degraded',
      hasToken,
      vectorDatabase: {
        type: 'Qdrant',
        status: qdrantStatus.healthy ? 'connected' : 'disconnected',
        collection: process.env.QDRANT_COLLECTION || 'campuscrew_docs',
        error: qdrantStatus.error
      },
      aiModel: {
        name: configuredModel,
        provider: 'ChatAnywhere GPT'
      },
      apiPermission: hasToken ? 'Available (ChatAnywhere API)' : 'Missing CHATANYWHERE_API_KEY'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /chat/reload-knowledge
 * Reload Qdrant vector database (run setup_vector_db.js manually)
 */
router.post('/chat/reload-knowledge', async (req, res) => {
  try {
    // Test Qdrant connection
    const connectionTest = await qdrantService.testConnection();
    
    if (!connectionTest.success) {
      return res.status(503).json({
        success: false,
        message: 'Cannot connect to Qdrant vector database',
        error: connectionTest.error,
        instructions: 'Run: node setup_vector_db.js to populate the database'
      });
    }
    
    // Get collection info
    const collectionInfo = await qdrantService.vectorDB.getCollectionInfo();
    
    res.json({
      success: true,
      message: 'Qdrant vector database is ready',
      collection: collectionInfo.collectionName,
      vectorCount: collectionInfo.vectorsCount,
      instructions: 'To update content: 1) Edit files in data/website_content/, 2) Run: node setup_vector_db.js'
    });
  } catch (error) {
    console.error('Error checking Qdrant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check vector database',
      instructions: 'Run: node setup_vector_db.js to populate the database'
    });
  }
});

/**
 * POST /chat/crawl
 * Crawl website and update knowledge base
 * Note: After crawling, you must run setup_vector_db.js to index into Qdrant
 */
router.post('/chat/crawl', async (req, res) => {
  try {
    const frontendUrl = req.body.url || process.env.FRONTEND_URL || 'http://localhost:3000';
    const outputDir = path.join(__dirname, '../data/website_content');
    
    console.log(`Starting crawl of ${frontendUrl}...`);
    
    let pageCount = 0;
    
    // Use basic crawler (Firecrawl and other crawlers removed for simplicity)
    console.log('Using basic crawler...');
    const WebsiteCrawler = require('../utils/crawler');
    const crawler = new WebsiteCrawler(frontendUrl);
    pageCount = await crawler.crawl(outputDir);
    
    res.json({
      success: true,
      message: 'Website crawled successfully',
      pagesCrawled: pageCount,
      outputDirectory: outputDir,
      nextSteps: [
        'Files saved to data/website_content/',
        'Run: node setup_vector_db.js to index into Qdrant',
        'Then your chatbot will use the updated content'
      ]
    });
  } catch (error) {
    console.error('Crawl error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to crawl website',
      details: error.message
    });
  }
});

/**
 * GET /chat/stats
 * Get chatbot statistics
 */
router.get('/chat/stats', async (req, res) => {
  try {
    const dbStats = await dbTools.getEventStats();
    
    // Get Qdrant stats
    let qdrantStats = { available: false, vectorCount: 0 };
    try {
      const collectionInfo = await qdrantService.vectorDB.getCollectionInfo();
      qdrantStats = {
        available: true,
        collection: collectionInfo.collectionName,
        vectorCount: collectionInfo.vectorsCount
      };
    } catch (error) {
      qdrantStats.error = error.message;
    }
    
    res.json({
      success: true,
      vectorDatabase: qdrantStats,
      database: dbStats,
      groqApiKey: !!GROQ_API_KEY
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /chat/models
 * Provide current Hugging Face model info (static), since HF Inference API does not list models per key
 */
router.get('/chat/models', async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(400).json({ success: false, error: 'GROQ_API_KEY not configured' });
    }
    res.json({
      success: true,
      count: 1,
      models: [{ name: GROQ_MODEL, provider: 'Groq', note: 'Configured model for chat completions' }]
    });
  } catch (error) {
    const status = error.response?.status || error.status || 500;
    const message = error.response?.data?.error?.message || error.message;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * POST /chat/test-firecrawl
 * Test Firecrawl connection and configuration
 */
router.post('/chat/test-firecrawl', async (req, res) => {
  try {
    if (!firecrawlService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Firecrawl is not configured. Please set FIRECRAWL_API_KEY in your .env file.',
        instructions: 'Get your API key from: https://www.firecrawl.dev/'
      });
    }

    const testResult = await firecrawlService.testConnection();
    
    if (testResult) {
      res.json({
        success: true,
        message: 'Firecrawl is working correctly!',
        configured: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Firecrawl test failed. Check your API key and frontend URL.',
        configured: true
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      configured: firecrawlService.isConfigured()
    });
  }
});

/**
 * GET /chat-status
 * Get RAG system status for frontend testing
 */
router.get('/chat-status', async (req, res) => {
  try {
    // Get RAG system status
    const ragStatus = ragSystem.getStatus();
    
    // Check if localhost is accessible
    const localhostTest = await ragSystem.checkLocalhost();
    
    res.json({
      success: true,
      rag: {
        initialized: ragStatus.initialized,
        totalChunks: ragStatus.totalChunks,
        hasLiveData: ragStatus.hasLiveData,
        sources: ragStatus.sources,
        localhostDetected: localhostTest
      },
      aiModel: HF_MODEL,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      rag: { initialized: false }
    });
  }
});

/**
 * GET /chat/rag-status
 * Get RAG system status and statistics including auto-scraping
 */
router.get('/chat/rag-status', async (req, res) => {
  try {
    // Get both RAG systems status
    const standardStatus = ragSystem.getStatus();
    const autoStatus = autoRAG.getStatus();
    
    // Test a sample query to verify functionality
    const testQuery = 'How to create events';
    const autoTestResult = await autoRAG.processQuery(testQuery);
    
    res.json({
      success: true,
      rag: {
        standard: {
          initialized: standardStatus.initialized,
          totalChunks: standardStatus.totalChunks,
          hasLiveData: standardStatus.hasLiveData,
          sources: standardStatus.sources
        },
        autoScraping: {
          initialized: autoStatus.initialized,
          totalChunks: autoStatus.totalChunks,
          staticChunks: autoStatus.staticChunks,
          liveChunks: autoStatus.liveChunks,
          scrapedPages: autoStatus.scrapedPages,
          autoScrapeEnabled: autoStatus.autoScrapeEnabled,
          lastScrapeTime: autoStatus.lastScrapeTime,
          sources: autoStatus.sources
        },
        testQuery: {
          query: testQuery,
          hasRelevantInfo: autoTestResult?.hasRelevantInfo || false,
          confidence: autoTestResult?.confidence || 0,
          liveChunks: autoTestResult?.liveChunks || 0,
          responseTime: autoTestResult?.responseTime || 0
        }
      },
      config: {
        ragEnabled: process.env.RAG_ENABLED === 'true',
        autoScrapeEnabled: process.env.RAG_AUTO_SCRAPE === 'true',
        scrapeInterval: process.env.RAG_SCRAPE_INTERVAL || '300000',
        hfModel: process.env.HF_MODEL,
        frontendUrl: process.env.frontend_url,
        backendUrl: process.env.backend_url
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      rag: { initialized: false }
    });
  }
});

/**
 * POST /chat/refresh-pages
 * Manually trigger page scraping and auto-scraping of localhost pages
 */
router.post('/chat/refresh-pages', async (req, res) => {
  try {
    console.log('🔄 Manual page refresh triggered via API');
    
    // Try auto RAG first, then fall back to manual refresh
    try {
      const refreshedStatus = await autoRAG.refreshPages();
      return res.json({
        success: true,
        message: 'Pages refreshed successfully (autoRAG)',
        rag: {
          totalChunks: refreshedStatus.totalChunks,
          staticChunks: refreshedStatus.staticChunks,
          liveChunks: refreshedStatus.liveChunks,
          scrapedPages: refreshedStatus.scrapedPages,
          lastScrapeTime: refreshedStatus.lastScrapeTime
        },
        timestamp: new Date().toISOString()
      });
    } catch (autoError) {
      console.log('AutoRAG failed, trying manual refresh:', autoError.message);
      await ragSystem.manualRefresh();
      const status = ragSystem.getStatus();
      
      return res.json({
        success: true,
        message: 'Page refresh completed (manual)',
        rag: {
          totalChunks: status.totalChunks,
          staticChunks: status.staticChunks,
          liveChunks: status.liveChunks,
          scrapedPages: status.scrapedPages,
          lastScrapeTime: status.lastScrapeTime ? new Date(status.lastScrapeTime).toISOString() : null
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /chat/memory-status
 * Get conversation memory statistics
 */
router.get('/chat/memory-status', async (req, res) => {
  try {
    const stats = conversationMemory.getStats();
    
    res.json({
      success: true,
      memory: {
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        totalMessages: stats.totalMessages,
        averageMessages: stats.averageMessages,
        memoryUsage: stats.memoryUsage,
        maxMessages: conversationMemory.maxMessages,
        sessionTimeout: conversationMemory.sessionTimeout / (1000 * 60) // minutes
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /chat/conversation/:userId
 * Get conversation history for a specific user
 */
router.get('/chat/conversation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const conversation = conversationMemory.getConversation(userId);
    const summary = conversationMemory.getConversationSummary(userId);
    
    res.json({
      success: true,
      conversation: {
        messages: conversation,
        summary: summary,
        hasOngoing: conversationMemory.hasOngoingConversation(userId)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /chat/conversation/:userId
 * Clear conversation history for a specific user
 */
router.delete('/chat/conversation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cleared = conversationMemory.clearConversation(userId);
    
    res.json({
      success: true,
      message: cleared ? 'Conversation history cleared' : 'No conversation found',
      cleared,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /chat/greeting/:userId
 * Get personalized greeting for a user based on conversation history
 */
router.post('/chat/greeting/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const greeting = conversationMemory.getPersonalizedGreeting(userId);
    const summary = conversationMemory.getConversationSummary(userId);
    
    res.json({
      success: true,
      greeting,
      conversationSummary: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
