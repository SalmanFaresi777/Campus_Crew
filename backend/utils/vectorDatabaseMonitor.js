/**
 * Vector Database Monitor
 * Tracks and logs all vector database operations for debugging and monitoring
 */

class VectorDatabaseMonitor {
  constructor() {
    this.queries = [];
    this.vectorSearches = [];
    this.fallbacks = [];
    this.ragUsages = [];
    this.sessionStats = {
      totalQueries: 0,
      vectorSearches: 0,
      fallbacks: 0,
      ragUsed: 0,
      startTime: Date.now()
    };
  }

  /**
   * Track a user query
   */
  async trackQuery(query, userId = 'anonymous') {
    this.queries.push({
      query,
      userId,
      timestamp: new Date().toISOString()
    });
    this.sessionStats.totalQueries++;
    
    console.log(`📝 Query tracked: "${query}" (User: ${userId})`);
  }

  /**
   * Track a vector search operation
   */
  async trackVectorSearch(query, searchTime, results = [], model = 'unknown') {
    const searchData = {
      query,
      searchTime,
      resultsCount: results.length,
      model,
      timestamp: new Date().toISOString()
    };
    
    this.vectorSearches.push(searchData);
    this.sessionStats.vectorSearches++;
    
    console.log(`🔍 Vector search: "${query}" - ${results.length} results (${searchTime}ms) [${model}]`);
  }

  /**
   * Track when a fallback is used
   */
  async trackFallback(reason, fallbackType = 'keyword_search') {
    const fallbackData = {
      reason,
      fallbackType,
      timestamp: new Date().toISOString()
    };
    
    this.fallbacks.push(fallbackData);
    this.sessionStats.fallbacks++;
    
    console.log(`⚠️ Fallback used: ${reason} -> ${fallbackType}`);
  }

  /**
   * Track RAG usage
   */
  async trackRAGUsage(ragContext, response, enabled) {
    const ragData = {
      contextLength: ragContext?.length || 0,
      responseLength: response?.length || 0,
      enabled,
      timestamp: new Date().toISOString()
    };
    
    this.ragUsages.push(ragData);
    if (enabled) {
      this.sessionStats.ragUsed++;
    }
    
    console.log(`📚 RAG ${enabled ? 'USED' : 'SKIPPED'}: Context: ${ragData.contextLength} chars`);
  }

  /**
   * Log a general event
   */
  async log(eventType, message, data = {}) {
    console.log(`📊 [${eventType}] ${message}`, data);
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const uptime = Date.now() - this.sessionStats.startTime;
    return {
      ...this.sessionStats,
      uptime,
      uptimeMinutes: Math.floor(uptime / 60000)
    };
  }

  /**
   * Print a monitoring dashboard
   */
  printDashboard() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 VECTOR DATABASE MONITORING DASHBOARD');
    console.log('═══════════════════════════════════════════════════════');
    
    const stats = this.getSessionStats();
    console.log(`⏱️  Session Uptime: ${stats.uptimeMinutes} minutes`);
    console.log(`📝 Total Queries: ${stats.totalQueries}`);
    console.log(`🔍 Vector Searches: ${stats.vectorSearches}`);
    console.log(`⚠️  Fallbacks Used: ${stats.fallbacks}`);
    console.log(`📚 RAG Usage Count: ${stats.ragUsed}`);
    
    if (stats.totalQueries > 0) {
      const ragPercentage = ((stats.ragUsed / stats.totalQueries) * 100).toFixed(1);
      const fallbackPercentage = ((stats.fallbacks / stats.totalQueries) * 100).toFixed(1);
      console.log(`\n📈 RAG Usage Rate: ${ragPercentage}%`);
      console.log(`📉 Fallback Rate: ${fallbackPercentage}%`);
    }
    
    // Recent queries
    if (this.queries.length > 0) {
      console.log('\n📋 Recent Queries:');
      const recentQueries = this.queries.slice(-5);
      recentQueries.forEach((q, i) => {
        console.log(`   ${i + 1}. "${q.query}" (${q.timestamp})`);
      });
    }
    
    // Recent vector searches
    if (this.vectorSearches.length > 0) {
      console.log('\n🔍 Recent Vector Searches:');
      const recentSearches = this.vectorSearches.slice(-5);
      recentSearches.forEach((s, i) => {
        console.log(`   ${i + 1}. "${s.query}" - ${s.resultsCount} results (${s.searchTime}ms)`);
      });
    }
    
    // Fallback summary
    if (this.fallbacks.length > 0) {
      console.log('\n⚠️  Recent Fallbacks:');
      const recentFallbacks = this.fallbacks.slice(-5);
      recentFallbacks.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.reason} -> ${f.fallbackType}`);
      });
    }
    
    console.log('═══════════════════════════════════════════════════════\n');
  }

  /**
   * Reset all monitoring data
   */
  reset() {
    this.queries = [];
    this.vectorSearches = [];
    this.fallbacks = [];
    this.ragUsages = [];
    this.sessionStats = {
      totalQueries: 0,
      vectorSearches: 0,
      fallbacks: 0,
      ragUsed: 0,
      startTime: Date.now()
    };
    console.log('🔄 Monitor reset');
  }
}

// Export a singleton instance
module.exports = new VectorDatabaseMonitor();
