/**
 * Intent Classifier for Chatbot Queries
 * Determines the user's intent to route queries appropriately
 * 
 * Intent Types:
 * - GENERAL_EVENT_LIST: User wants to see available events (e.g., "show me events", "any events?")
 * - SPECIFIC_EVENT: User asks about a particular event (e.g., "fashion show fee", "glamour night details")
 * - EVENT_CATEGORY: User asks about events in a category (e.g., "cultural events")
 * - EVENT_STATS: User wants platform statistics (e.g., "how many events?", "total registrations")
 * - GENERAL_QUESTION: General question about platform/features (use RAG/vector DB)
 * - GREETING: Simple greeting or casual conversation
 */

/**
 * Classify user query intent
 * @param {string} query - The user's message
 * @returns {object} - { intent: string, confidence: number, entities: object }
 */
function classifyIntent(query) {
  const lowerQuery = query.toLowerCase().trim();
  
  // Intent patterns with priority (checked in order)
  const intentPatterns = [
    // GREETING - Simple greetings (highest priority for short messages)
    {
      intent: 'GREETING',
      patterns: [
        /^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|what's\s*up|whatsup|sup)[\s!.?]*$/i,
        /^(thanks|thank\s*you|ty|thx)[\s!.?]*$/i,
        /^(bye|goodbye|see\s*you|later|cya)[\s!.?]*$/i
      ],
      weight: 1.0
    },
    
    // EVENT_STATS - Platform statistics
    {
      intent: 'EVENT_STATS',
      patterns: [
        /how\s+many\s+(total\s+)?(events?|registrations?)/i,
        /(total|overall|all)\s+(events?|registrations?|participants?)/i,
        /platform\s+stat(istic)?s?/i,
        /event\s+stat(istic)?s?/i,
        /give\s+me\s+(the\s+)?stat(istic)?s?/i,
        /(show|tell)\s+(me\s+)?(the\s+)?(platform|event)\s+stat/i
      ],
      weight: 0.95
    },
    
    // SPECIFIC_EVENT - Questions about a specific event (higher priority than general)
    {
      intent: 'SPECIFIC_EVENT',
      patterns: [
        // Event name followed by query terms
        /^[\w\s:]+?\s+(fee|price|cost|registration\s*fee|entry\s*fee|ticket|prize|details?|info|when|date|location|time|deadline)[\s?!.]*$/i,
        
        // Common specific event query structures
        /what(?:'s| is)?\s+(the\s+)?(fee|price|cost|registration\s*fee|prize|detail)/i,
        /how\s+much\s+(is\s+)?(the\s+)?(fee|price|cost|registration|entry)/i,
        /when\s+is\s+(the\s+)?[\w\s]+\s*(event|happening|\?)/i,
        /where\s+is\s+(the\s+)?[\w\s]+\s*(event|held|\?)/i,
        
        // Event name in quotes or specific references
        /['"][\w\s:]+['"]\s+(event|fee|price|detail)/i,
        /(tell|show)\s+me\s+about\s+[\w\s:]{3,}/i,
        
        // Participant count for specific event
        /how\s+many\s+(people|participants?).*?(in|for|at)\s+[\w\s:]{3,}/i,
        
        // Questions with "the" indicating specific event
        /what\s+is\s+the\s+[\w\s:]+\s+(fee|price|prize|date)/i
      ],
      weight: 0.9,
      requiresEventName: true
    },
    
    // EVENT_CATEGORY - Category-specific queries
    {
      intent: 'EVENT_CATEGORY',
      patterns: [
        // Direct category mentions with "events"
        /(cultural|arts?|career|environment|literary|seminar|speaking|sports?)\s+(events?|activities?|programs?)/i,
        
        // "show me [category]" patterns
        /(show|list|tell|give)\s+(me\s+)?(all\s+)?(the\s+)?(cultural|arts?|career|environment|literary|seminar|sports?)/i,
        
        // "events in/from/of [category]"
        /events?\s+(in|from|of|about)\s+(the\s+)?(cultural|arts?|career|environment|literary|seminar|sports?)/i,
        
        // "what [category] events"
        /what\s+(cultural|arts?|career|environment|literary|seminar|sports?)\s+events?/i,
        
        // "any/some [category] events" - IMPORTANT: This should match before GENERAL_EVENT_LIST
        /(any|some|there\s+any)\s+(cultural|arts?|career|environment|literary|seminar|sports?)\s+events?/i,
        
        // "is there any event in [category]" or "are there any events in [category]"
        /(?:is|are)\s+there\s+(?:any|some)\s+events?\s+(?:in|from|for)\s+(?:the\s+)?(cultural|arts?|career|environment|literary|seminar|sports?)\s+category/i,
        
        // "is there any event is [category] category" (grammatically odd but user might type)
        /(?:is|are)\s+there\s+(?:any|some)\s+events?\s+(?:is|in|from|for)\s+(cultural|arts?|career|environment|literary|seminar|sports?)\s+category/i,
        
        // Generic "events in [category] category"
        /events?\s+(?:in|from|of)\s+(?:the\s+)?[\w\s&]+\s+category/i
      ],
      weight: 0.85
    },
    
    // GENERAL_EVENT_LIST - User wants to browse/see events
    {
      intent: 'GENERAL_EVENT_LIST',
      patterns: [
        // Direct requests for events
        /(show|list|tell|give|display)\s+(me\s+)?(all\s+)?(the\s+)?(available\s+|upcoming\s+|current\s+)?events?/i,
        /what\s+events?\s+(are\s+)?(available|happening|coming|upcoming|there)/i,
        /(any|some)\s+events?\s+(available|happening|here|coming|upcoming)?/i,
        
        // Questions about event existence
        /are\s+there\s+(any\s+)?events?/i,
        /do\s+you\s+have\s+(any\s+)?events?/i,
        /can\s+i\s+(see|know|find|get)\s+(any\s+|some\s+)?events?/i,
        
        // "about events" or "know about events"
        /(know|learn|hear)\s+about\s+(any\s+|some\s+)?events?/i,
        /events?\s+(from\s+)?here/i,
        /which\s+events?\s+(are\s+)?(available|here)/i,
        
        // Upcoming/next event queries
        /(upcoming|next|coming|future)\s+events?/i,
        /what'?s\s+(happening|coming|next)/i,
        
        // General event browsing
        /browse\s+events?/i,
        /view\s+(all\s+)?events?/i,
        /event\s+(list|catalog|directory)/i
      ],
      weight: 0.8
    },
    
    // GENERAL_QUESTION - Platform/feature questions (use RAG)
    {
      intent: 'GENERAL_QUESTION',
      patterns: [
        // Platform questions
        /what\s+(is|are)\s+(campuscrew|this\s+platform|this\s+site|this\s+website)/i,
        /how\s+(does|do|can)\s+(campuscrew|this\s+platform|this)/i,
        /tell\s+me\s+about\s+(campuscrew|this\s+platform|your\s+platform)/i,
        
        // Team/member questions (should use RAG, not search events)
        /(who\s+(are|is)|tell\s+me\s+about|about)\s+(the\s+)?(campuscrew\s+)?(team|members?|founders?|creators?|developers?)/i,
        /campuscrew\s+(team|members?|founders?|staff)/i,
        
        // Contact questions
        /(how\s+to|how\s+can\s+i|how\s+do\s+i)\s+(contact|reach|email|call|message)/i,
        /contact\s+(us|campuscrew|information|details?)/i,
        /(email|phone|address|location)\s+(of\s+)?(campuscrew|platform)/i,
        /(give|tell|show|provide)\s+(me\s+)?(the\s+)?(campuscrew\s+)?(email|phone|address|location|contact)/i,
        /(what\s+is|what'?s)\s+(the\s+)?(campuscrew\s+)?(email|phone|address|location|contact)/i,
        /campuscrew\s+(email|phone|address|location|contact)/i,
        
        // About page content
        /about\s+(us|campuscrew|the\s+platform)/i,
        
        // Feature questions
        /how\s+(to|do\s+i)\s+(register|sign\s*up|join|participate)/i,
        /what\s+(features|services|benefits)/i,
        /can\s+i\s+(register|sign\s*up|join|create)/i,
        
        // Help/support questions
        /help/i,
        /how\s+does\s+(registration|payment|event)/i,
        /what\s+can\s+(i|you)\s+(do|help)/i
      ],
      weight: 0.7
    }
  ];
  
  let bestMatch = {
    intent: 'GENERAL_QUESTION', // Default fallback
    confidence: 0.3,
    entities: {}
  };
  
  // Check each intent pattern
  for (const intentConfig of intentPatterns) {
    for (const pattern of intentConfig.patterns) {
      if (pattern.test(lowerQuery)) {
        // Calculate confidence based on pattern weight and match quality
        let confidence = intentConfig.weight;
        
        // Boost confidence for exact/strong matches
        const match = lowerQuery.match(pattern);
        if (match && match[0].length / lowerQuery.length > 0.7) {
          confidence = Math.min(1.0, confidence + 0.1);
        }
        
        // For SPECIFIC_EVENT, verify we can extract an event name
        if (intentConfig.intent === 'SPECIFIC_EVENT' && intentConfig.requiresEventName) {
          const eventName = extractEventNameFromQuery(query);
          if (!eventName || eventName.length < 3) {
            // No clear event name found, reduce confidence
            confidence *= 0.5;
            continue;
          } else {
            bestMatch.entities.eventName = eventName;
          }
        }
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            intent: intentConfig.intent,
            confidence: confidence,
            entities: bestMatch.entities || {}
          };
        }
        
        break; // Found a match for this intent, move to next
      }
    }
  }
  
  // Extract additional entities based on intent
  if (bestMatch.intent === 'EVENT_CATEGORY') {
    bestMatch.entities.category = extractCategoryFromQuery(query);
  }
  
  if (bestMatch.intent === 'SPECIFIC_EVENT' && !bestMatch.entities.eventName) {
    bestMatch.entities.eventName = extractEventNameFromQuery(query);
  }
  
  // Extract attribute being asked about (fee, prize, deadline, etc.)
  bestMatch.entities.attribute = extractAttributeFromQuery(query);
  
  console.log(`🎯 Intent Classification: ${bestMatch.intent} (confidence: ${(bestMatch.confidence * 100).toFixed(1)}%)`, 
              bestMatch.entities);
  
  return bestMatch;
}

/**
 * Extract event name from query with improved patterns
 */
function extractEventNameFromQuery(query) {
  // First, check if this is NOT an event query
  const nonEventPatterns = [
    /\b(team|members?|founders?|staff|developers?|creators?)\b/i,
    /\b(contact|email|phone|address|location)\b/i,
    /\b(about\s+us|about\s+campuscrew|about\s+the\s+platform|about\s+this\s+platform)\b/i,
    /\b(this\s+platform|the\s+platform|campuscrew\s+platform)\b/i,
    /\b(how\s+to|features|services|benefits|help)\b/i
  ];
  
  // If query matches non-event patterns, don't extract event name
  for (const pattern of nonEventPatterns) {
    if (pattern.test(query)) {
      return null;
    }
  }
  
  const patterns = [
    // Direct event references
    /(?:event\s+(?:called|named)?["']?([^"'?.!]+)["']?)/i,
    /(?:["']([^"']+)["']\s+event)/i,
    /(?:about|for)\s+["']?([^"'?.!]+)["']?\s+event/i,
    
    // "[event name] + fee/price/prize/details"
    /^([a-zA-Z\s:]+?)\s+(?:fee|price|cost|registration\s*fee|entry\s*fee|ticket|prize(?:\s*money)?|details?|info|information)[\s?!.]*$/i,
    
    // "what is the [event name] fee"
    /what(?:'s| is)?\s*(?:the\s*)?(?:fee|price|cost|prize)\s*(?:for|of|in)\s+(?:the\s+)?([a-zA-Z\s:]+?)(?:\s*\?|$)/i,
    
    // "how much is [event name]"
    /how\s+much[^?\n]*?(?:for|of|in)\s+(?:the\s+)?([a-zA-Z\s:]+?)(?:\s*\?|$)/i,
    
    // "when is [event name]"
    /when\s+is\s+(?:the\s+)?([a-zA-Z\s:]+?)(?:\s*\?|$)/i,
    
    // "tell me about [event name]"
    /tell\s+me\s+about\s+(?:the\s+)?([a-zA-Z\s:]+?)(?:\s*\?|$)/i,
    
    // "participants in/for [event name]"
    /participants?\s+(?:in|for|of)\s+(?:the\s+)?([a-zA-Z\s:]+?)(?:\s*\?|$)/i,
    
    // "[event name] details"
    /^([a-zA-Z\s:]+?)\s+(?:details?|info|information)[\s?!.]*$/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      let eventName = match[1].trim();
      
      // Clean up common artifacts
      eventName = eventName.replace(/^(the|a|an)\s+/i, ''); // Remove articles
      eventName = eventName.replace(/\s+(is|are|was|were)$/i, ''); // Remove trailing verbs
      eventName = eventName.replace(/\s+(event|happening)$/i, ''); // Remove trailing "event"
      
      // Filter out queries that are too generic or contain question words
      const genericTerms = /^(any|some|all|there|what|when|where|how|which|events?|from here)$/i;
      const questionWords = /(what|when|where|how|which|why|who|can|could|would|should)/i;
      
      // Additional filter: Don't treat platform/team/contact queries as event names
      const platformTerms = /^(campuscrew|platform|team|member|contact|about|help|feature|service)$/i;
      
      if (genericTerms.test(eventName) || platformTerms.test(eventName) || eventName.split(/\s+/).every(word => questionWords.test(word))) {
        continue; // Skip this match, try next pattern
      }
      
      // Only return if we have a meaningful name
      if (eventName.length > 2 && !genericTerms.test(eventName) && !platformTerms.test(eventName)) {
        return eventName;
      }
    }
  }
  
  return null;
}

/**
 * Extract category from query
 */
function extractCategoryFromQuery(query) {
  const knownCategories = [
    'Cultural', 'Arts & Creativity', 'Arts', 'Career & Professional Development', 
    'Career', 'Environment', 'Literary', 'Speaking', 'Seminar', 'Sports'
  ];
  
  // Check for direct category mentions (including "sports")
  for (const category of knownCategories) {
    if (new RegExp(`\\b${category}\\b`, 'i').test(query)) {
      return category;
    }
  }
  
  // Extract from patterns like "events in [category]" or "[category] events"
  const patterns = [
    // "is there any event is [category] category"
    /(?:is|are)\s+there\s+(?:any|some)\s+events?\s+(?:is|in|from|for)\s+([a-zA-Z\s&]+?)\s+category/i,
    // "events in the [category] category"
    /events?\s+(?:in|from|of)\s+(?:the\s+)?([a-zA-Z\s&]+?)\s+category/i,
    // "in [category] category"
    /(?:in|from|of)\s+(?:the\s+)?([a-zA-Z\s&]+?)\s+category/i,
    // "[category] events" or "[category] category"
    /([a-zA-Z\s&]+?)\s+(?:events?|category)/i,
    // "any [category] events"
    /(?:any|some)\s+([a-zA-Z\s&]+?)\s+events?/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      let category = match[1].trim();
      
      // Clean up common words that aren't categories
      category = category.replace(/^(any|some|the|all|there)\s+/i, '');
      category = category.replace(/\s+(event|events|is|are)$/i, '');
      
      // Skip if the extracted text is just a filler word
      if (/^(any|some|the|all|there|event|events)$/i.test(category)) {
        continue;
      }
      
      // Find best matching known category
      for (const known of knownCategories) {
        if (new RegExp(known, 'i').test(category) || new RegExp(category, 'i').test(known)) {
          return known;
        }
      }
      
      // Capitalize first letter if returning unknown category
      if (category.length > 2) {
        return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
      }
    }
  }
  
  return null;
}

/**
 * Extract attribute being asked about (fee, prize, deadline, etc.)
 */
function extractAttributeFromQuery(query) {
  const attributes = [
    { key: 'fee', patterns: [/\b(registration\s*)?(fee|cost|price|entry(?:\s*fee)?|ticket(?:\s*price)?)\b/i] },
    { key: 'prize', patterns: [/\b(prize(?:\s*money)?|reward|winnings|price\s*money)\b/i] },
    { key: 'deadline', patterns: [/\b(registration\s*)?(last\s*date|final\s*date|deadline|close\s*date|end\s*date)\b/i] },
    { key: 'date', patterns: [/\b(when|date|time|schedule|timing)\b/i] },
    { key: 'location', patterns: [/\b(where|location|venue|place)\b/i] },
    { key: 'participants', patterns: [/\b(participants?|attendees?|how\s+many\s+people|registrations?)\b/i] },
    { key: 'details', patterns: [/\b(details?|info(?:rmation)?|about|describe)\b/i] }
  ];
  
  for (const attr of attributes) {
    for (const pattern of attr.patterns) {
      if (pattern.test(query)) {
        return attr.key;
      }
    }
  }
  
  return null;
}

/**
 * Check if query needs database access based on intent
 */
function requiresDatabaseAccess(intent) {
  const dbIntents = [
    'GENERAL_EVENT_LIST',
    'SPECIFIC_EVENT',
    'EVENT_CATEGORY',
    'EVENT_STATS'
  ];
  
  return dbIntents.includes(intent);
}

/**
 * Get appropriate response type based on intent
 */
function getResponseStrategy(intentResult) {
  const { intent, entities } = intentResult;
  
  switch (intent) {
    case 'GREETING':
      return {
        type: 'SIMPLE_RESPONSE',
        useDatabase: false,
        useRAG: false,
        template: 'greeting'
      };
      
    case 'EVENT_STATS':
      return {
        type: 'DATABASE_QUERY',
        useDatabase: true,
        useRAG: false,
        queryType: 'stats'
      };
      
    case 'GENERAL_EVENT_LIST':
      return {
        type: 'DATABASE_QUERY',
        useDatabase: true,
        useRAG: false,
        queryType: 'list_upcoming',
        limit: 10
      };
      
    case 'EVENT_CATEGORY':
      return {
        type: 'DATABASE_QUERY',
        useDatabase: true,
        useRAG: false,
        queryType: 'category',
        category: entities.category
      };
      
    case 'SPECIFIC_EVENT':
      return {
        type: 'DATABASE_QUERY',
        useDatabase: true,
        useRAG: false,
        queryType: 'specific_event',
        eventName: entities.eventName,
        attribute: entities.attribute
      };
      
    case 'GENERAL_QUESTION':
    default:
      return {
        type: 'RAG_RESPONSE',
        useDatabase: false,
        useRAG: true,
        includeContext: true
      };
  }
}

module.exports = {
  classifyIntent,
  extractEventNameFromQuery,
  extractCategoryFromQuery,
  extractAttributeFromQuery,
  requiresDatabaseAccess,
  getResponseStrategy
};
