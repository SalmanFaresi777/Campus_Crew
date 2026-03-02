/**
 * Conversation Memory Manager for CampusCrew Chatbot
 * Manages conversation history and context for enhanced responses
 */

class ConversationMemory {
  constructor() {
    this.conversations = new Map(); // userId -> conversation history
    this.maxMessages = 10; // Remember last 10 messages per user
    this.maxUsers = 1000; // Limit memory usage
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    // Clean up old conversations periodically
    this.startCleanupTimer();
  }

  /**
   * Add a message to user's conversation history
   */
  addMessage(userId, role, content, metadata = {}) {
    if (!userId) {
      userId = 'anonymous';
    }

    // Get or create conversation for this user
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, {
        messages: [],
        lastActivity: Date.now(),
        sessionId: this.generateSessionId()
      });
    }

    const conversation = this.conversations.get(userId);
    
    // Add new message
    const message = {
      role, // 'user' or 'assistant'
      content,
      timestamp: Date.now(),
      sessionId: conversation.sessionId,
      ...metadata
    };

    conversation.messages.push(message);
    conversation.lastActivity = Date.now();

    // Keep only last N messages
    if (conversation.messages.length > this.maxMessages) {
      conversation.messages = conversation.messages.slice(-this.maxMessages);
    }

    // Limit total users to prevent memory issues
    if (this.conversations.size > this.maxUsers) {
      this.cleanupOldConversations();
    }

    console.log(`💭 Added ${role} message for user ${userId} (${conversation.messages.length}/${this.maxMessages} messages)`);
  }

  /**
   * Get conversation history for a user
   */
  getConversation(userId) {
    if (!userId) {
      userId = 'anonymous';
    }

    const conversation = this.conversations.get(userId);
    if (!conversation) {
      return [];
    }

    // Update last activity
    conversation.lastActivity = Date.now();
    
    return conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
  }

  /**
   * Get conversation context for RAG enhancement
   */
  getConversationContext(userId, includeTimestamps = false) {
    const history = this.getConversation(userId);
    
    if (history.length === 0) {
      return '';
    }

    // Build context string from recent messages
    let context = 'Recent conversation history:\n';
    
    history.slice(-6).forEach((msg, index) => { // Last 6 messages for context
      const timeStr = includeTimestamps ? 
        ` (${new Date(msg.timestamp).toLocaleTimeString()})` : '';
      context += `${msg.role === 'user' ? 'User' : 'Assistant'}${timeStr}: ${msg.content}\n`;
    });

    return context;
  }

  /**
   * Get conversation summary for better context
   */
  getConversationSummary(userId) {
    const history = this.getConversation(userId);
    
    if (history.length === 0) {
      return null;
    }

    const userMessages = history.filter(msg => msg.role === 'user');
    const topics = this.extractTopics(userMessages);
    
    return {
      messageCount: history.length,
      topics: topics,
      lastMessage: history[history.length - 1],
      duration: this.getConversationDuration(userId)
    };
  }

  /**
   * Extract topics from user messages
   */
  extractTopics(userMessages) {
    const topicKeywords = {
      'events': ['event', 'create', 'organize', 'registration', 'attend'],
      'dashboard': ['dashboard', 'manage', 'analytics', 'overview'],
      'payment': ['payment', 'bkash', 'fee', 'cost', 'money'],
      'certificates': ['certificate', 'download', 'completion'],
      'profile': ['profile', 'account', 'settings', 'personal'],
      'help': ['help', 'how', 'guide', 'tutorial', 'support']
    };

    const topics = new Set();
    const allText = userMessages.map(msg => msg.content.toLowerCase()).join(' ');

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => allText.includes(keyword))) {
        topics.add(topic);
      }
    });

    return Array.from(topics);
  }

  /**
   * Get conversation duration
   */
  getConversationDuration(userId) {
    const conversation = this.conversations.get(userId);
    if (!conversation || conversation.messages.length === 0) {
      return 0;
    }

    const firstMessage = conversation.messages[0];
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    
    return lastMessage.timestamp - firstMessage.timestamp;
  }

  /**
   * Clear conversation for a user
   */
  clearConversation(userId) {
    if (!userId) {
      userId = 'anonymous';
    }

    if (this.conversations.has(userId)) {
      this.conversations.delete(userId);
      console.log(`🗑️ Cleared conversation history for user ${userId}`);
      return true;
    }
    return false;
  }

  /**
   * Get memory statistics
   */
  getStats() {
    const totalUsers = this.conversations.size;
    let totalMessages = 0;
    let activeUsers = 0;
    const now = Date.now();

    this.conversations.forEach(conversation => {
      totalMessages += conversation.messages.length;
      if (now - conversation.lastActivity < this.sessionTimeout) {
        activeUsers++;
      }
    });

    return {
      totalUsers,
      activeUsers,
      totalMessages,
      averageMessages: totalUsers > 0 ? Math.round(totalMessages / totalUsers) : 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    
    this.conversations.forEach(conversation => {
      conversation.messages.forEach(message => {
        totalSize += message.content.length * 2; // Rough estimate for string storage
        totalSize += 100; // Overhead for object properties
      });
    });

    return {
      bytes: totalSize,
      kb: Math.round(totalSize / 1024),
      mb: Math.round(totalSize / (1024 * 1024) * 100) / 100
    };
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Clean up old conversations
   */
  cleanupOldConversations() {
    const now = Date.now();
    let removedCount = 0;

    this.conversations.forEach((conversation, userId) => {
      if (now - conversation.lastActivity > this.sessionTimeout) {
        this.conversations.delete(userId);
        removedCount++;
      }
    });

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old conversations`);
    }
  }

  /**
   * Start periodic cleanup timer
   */
  startCleanupTimer() {
    // Clean up every hour
    setInterval(() => {
      this.cleanupOldConversations();
    }, 60 * 60 * 1000);
  }

  /**
   * Check if user has ongoing conversation
   */
  hasOngoingConversation(userId) {
    if (!userId) {
      userId = 'anonymous';
    }

    const conversation = this.conversations.get(userId);
    if (!conversation) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastMessage = now - conversation.lastActivity;
    
    // Consider conversation ongoing if last message was within 30 minutes
    return timeSinceLastMessage < (30 * 60 * 1000);
  }

  /**
   * Get personalized greeting based on conversation history
   */
  getPersonalizedGreeting(userId) {
    const summary = this.getConversationSummary(userId);
    
    if (!summary) {
      return "Hello! How can I help you with CampusCrew today?";
    }

    const { topics, messageCount } = summary;
    
    if (messageCount === 1) {
      return "Welcome back! What would you like to know about CampusCrew?";
    }

    if (topics.length > 0) {
      const topicText = topics.slice(0, 2).join(' and ');
      return `Hi again! I see we've been discussing ${topicText}. How can I help you further?`;
    }

    return `Welcome back! We've chatted ${messageCount} times. What can I help you with today?`;
  }
}

// Export singleton instance
const conversationMemory = new ConversationMemory();

module.exports = conversationMemory;