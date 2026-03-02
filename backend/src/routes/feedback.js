/**
 * Feedback Route
 * Collects user feedback on RAG responses for continuous improvement
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config');

/**
 * Feedback Schema
 * Stores user feedback on RAG responses
 */
const feedbackSchema = new mongoose.Schema({
  // Query Information
  sessionId: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  sources: [{
    id: String,
    title: String,
    url: String,
    relevanceScore: Number
  }],

  // Feedback
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer between 1 and 5'
    }
  },
  helpful: { type: Boolean, required: true },
  comment: { type: String, maxlength: 1000 },
  
  // Detailed Feedback
  accuracy: { type: Number, min: 1, max: 5 },
  relevance: { type: Number, min: 1, max: 5 },
  completeness: { type: Number, min: 1, max: 5 },
  clarity: { type: Number, min: 1, max: 5 },
  
  // Source Feedback
  sourceFeedback: [{
    sourceId: String,
    wasHelpful: Boolean,
    reason: String
  }],

  // Technical Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    processingTime: Number,
    retrievedDocs: Number,
    model: String,
    timestamp: { type: Date, default: Date.now }
  },

  // System Fields
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  version: { type: String, default: '1.0' }
});

// Indexes for performance
feedbackSchema.index({ sessionId: 1, createdAt: -1 });
feedbackSchema.index({ rating: 1, helpful: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ 'metadata.model': 1 });

const Feedback = mongoose.model('RAGFeedback', feedbackSchema);

/**
 * Analytics Service for feedback processing
 */
class FeedbackAnalytics {
  /**
   * Gets overall feedback statistics
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Analytics data
   */
  static async getOverallStats(filters = {}) {
    const matchStage = { ...filters };
    
    // Add date range if provided
    if (filters.startDate || filters.endDate) {
      matchStage.createdAt = {};
      if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
      delete matchStage.startDate;
      delete matchStage.endDate;
    }

    const stats = await Feedback.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          helpfulCount: { $sum: { $cond: ['$helpful', 1, 0] } },
          averageAccuracy: { $avg: '$accuracy' },
          averageRelevance: { $avg: '$relevance' },
          averageCompleteness: { $avg: '$completeness' },
          averageClarity: { $avg: '$clarity' },
          averageProcessingTime: { $avg: '$metadata.processingTime' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    if (!stats.length) {
      return {
        totalFeedback: 0,
        averageRating: 0,
        helpfulPercentage: 0,
        ratingDistribution: {}
      };
    }

    const result = stats[0];
    
    // Calculate rating distribution
    const ratingCounts = {};
    result.ratingDistribution.forEach(rating => {
      ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
    });

    return {
      totalFeedback: result.totalFeedback,
      averageRating: Math.round(result.averageRating * 100) / 100,
      helpfulPercentage: Math.round((result.helpfulCount / result.totalFeedback) * 100),
      averageAccuracy: Math.round((result.averageAccuracy || 0) * 100) / 100,
      averageRelevance: Math.round((result.averageRelevance || 0) * 100) / 100,
      averageCompleteness: Math.round((result.averageCompleteness || 0) * 100) / 100,
      averageClarity: Math.round((result.averageClarity || 0) * 100) / 100,
      averageProcessingTime: Math.round(result.averageProcessingTime || 0),
      ratingDistribution: ratingCounts
    };
  }

  /**
   * Gets feedback trends over time
   * @param {string} period - Period for grouping (day, week, month)
   * @param {number} limit - Number of periods to return
   * @returns {Promise<Array>} Trend data
   */
  static async getTrends(period = 'day', limit = 30) {
    const groupFormat = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week: { $dateToString: { format: '%Y-%U', date: '$createdAt' } },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
    };

    const trends = await Feedback.aggregate([
      {
        $group: {
          _id: groupFormat[period],
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          helpfulCount: { $sum: { $cond: ['$helpful', 1, 0] } }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: limit },
      {
        $project: {
          period: '$_id',
          count: 1,
          averageRating: { $round: ['$averageRating', 2] },
          helpfulPercentage: {
            $round: [{ $multiply: [{ $divide: ['$helpfulCount', '$count'] }, 100] }, 1]
          }
        }
      }
    ]);

    return trends.reverse(); // Return chronological order
  }

  /**
   * Gets feedback by model performance
   * @returns {Promise<Array>} Model performance data
   */
  static async getModelPerformance() {
    return await Feedback.aggregate([
      {
        $group: {
          _id: '$metadata.model',
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          helpfulCount: { $sum: { $cond: ['$helpful', 1, 0] } },
          averageProcessingTime: { $avg: '$metadata.processingTime' }
        }
      },
      {
        $project: {
          model: '$_id',
          count: 1,
          averageRating: { $round: ['$averageRating', 2] },
          helpfulPercentage: {
            $round: [{ $multiply: [{ $divide: ['$helpfulCount', '$count'] }, 100] }, 1]
          },
          averageProcessingTime: { $round: ['$averageProcessingTime', 0] }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  /**
   * Gets common issues from negative feedback
   * @returns {Promise<Array>} Common issues
   */
  static async getCommonIssues() {
    const negativeComments = await Feedback.find({
      $or: [
        { rating: { $lte: 2 } },
        { helpful: false }
      ],
      comment: { $exists: true, $ne: '' }
    })
    .select('comment rating helpful')
    .limit(100)
    .sort({ createdAt: -1 });

    // Simple keyword extraction for common issues
    const keywords = {};
    const commonWords = ['not', 'wrong', 'incorrect', 'missing', 'incomplete', 'unclear', 'confusing', 'irrelevant'];
    
    negativeComments.forEach(feedback => {
      const words = feedback.comment.toLowerCase().split(/\s+/);
      words.forEach(word => {
        const cleaned = word.replace(/[^\w]/g, '');
        if (cleaned.length > 3 && commonWords.includes(cleaned)) {
          keywords[cleaned] = (keywords[cleaned] || 0) + 1;
        }
      });
    });

    return Object.entries(keywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ issue: word, frequency: count }));
  }
}

/**
 * POST /api/feedback
 * Submit feedback for a RAG response
 */
router.post('/feedback', async (req, res) => {
  try {
    const {
      sessionId,
      question,
      answer,
      sources,
      rating,
      helpful,
      comment,
      accuracy,
      relevance,
      completeness,
      clarity,
      sourceFeedback,
      metadata
    } = req.body;

    // Validate required fields
    if (!sessionId || !question || !answer || rating === undefined || helpful === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, question, answer, rating, helpful'
      });
    }

    // Validate rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be an integer between 1 and 5'
      });
    }

    // Create feedback document
    const feedback = new Feedback({
      sessionId,
      question: question.substring(0, 2000), // Limit length
      answer: answer.substring(0, 5000),
      sources: sources || [],
      rating,
      helpful,
      comment: comment ? comment.substring(0, 1000) : undefined,
      accuracy,
      relevance,
      completeness,
      clarity,
      sourceFeedback: sourceFeedback || [],
      metadata: {
        ...metadata,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        timestamp: new Date()
      }
    });

    await feedback.save();

    console.log(`📝 Feedback saved: ${rating}/5 stars, helpful: ${helpful}`);

    res.json({
      success: true,
      feedbackId: feedback._id,
      message: 'Thank you for your feedback!'
    });

  } catch (error) {
    console.error('❌ Feedback submission error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to save feedback',
      details: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/feedback/stats
 * Get feedback analytics (admin only)
 */
router.get('/feedback/stats', async (req, res) => {
  try {
    // TODO: Add authentication/authorization for admin endpoints
    
    const { startDate, endDate, model } = req.query;
    
    const filters = {};
    if (model) filters['metadata.model'] = model;
    
    const [
      overallStats,
      trends,
      modelPerformance,
      commonIssues
    ] = await Promise.all([
      FeedbackAnalytics.getOverallStats({ ...filters, startDate, endDate }),
      FeedbackAnalytics.getTrends('day', 30),
      FeedbackAnalytics.getModelPerformance(),
      FeedbackAnalytics.getCommonIssues()
    ]);

    res.json({
      success: true,
      data: {
        overall: overallStats,
        trends,
        modelPerformance,
        commonIssues
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Feedback stats error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate feedback statistics'
    });
  }
});

/**
 * GET /api/feedback/recent
 * Get recent feedback entries (admin only)
 */
router.get('/feedback/recent', async (req, res) => {
  try {
    // TODO: Add authentication/authorization
    
    const { limit = 20, rating, helpful } = req.query;
    
    const query = {};
    if (rating) query.rating = parseInt(rating);
    if (helpful !== undefined) query.helpful = helpful === 'true';
    
    const feedback = await Feedback.find(query)
      .select('question rating helpful comment metadata.model createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      feedback: feedback.map(f => ({
        id: f._id,
        question: f.question.substring(0, 100) + (f.question.length > 100 ? '...' : ''),
        rating: f.rating,
        helpful: f.helpful,
        comment: f.comment,
        model: f.metadata?.model,
        createdAt: f.createdAt
      }))
    });

  } catch (error) {
    console.error('❌ Recent feedback error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recent feedback'
    });
  }
});

/**
 * POST /api/feedback/bulk
 * Submit multiple feedback entries (for batch processing)
 */
router.post('/feedback/bulk', async (req, res) => {
  try {
    const { feedbackEntries } = req.body;
    
    if (!Array.isArray(feedbackEntries) || feedbackEntries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'feedbackEntries must be a non-empty array'
      });
    }

    if (feedbackEntries.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 feedback entries per batch'
      });
    }

    const results = [];
    
    for (const entry of feedbackEntries) {
      try {
        const feedback = new Feedback({
          ...entry,
          metadata: {
            ...entry.metadata,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
            timestamp: new Date()
          }
        });
        
        await feedback.save();
        results.push({ success: true, feedbackId: feedback._id });
        
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      processed: feedbackEntries.length,
      successful: successCount,
      failed: feedbackEntries.length - successCount,
      results
    });

  } catch (error) {
    console.error('❌ Bulk feedback error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk feedback'
    });
  }
});

module.exports = router;