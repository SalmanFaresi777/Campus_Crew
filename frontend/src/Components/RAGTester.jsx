/**
 * Frontend Chatbot RAG Integration Tester
 * Tests RAG system from the perspective of your React Chatbot component
 */

import React, { useState, useEffect } from 'react';

const RAGTester = () => {
  const [ragStatus, setRagStatus] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Test cases that mirror your Chatbot.jsx usage
  const testCases = [
    {
      id: 1,
      message: 'How do I create an event?',
      expectedKeywords: ['create', 'event', 'dashboard'],
      description: 'Event creation process'
    },
    {
      id: 2,
      message: 'What payment methods are supported?',
      expectedKeywords: ['bkash', 'payment'],
      description: 'Payment integration'
    },
    {
      id: 3,
      message: 'How can I register for events?',
      expectedKeywords: ['register', 'browse', 'events'],
      description: 'Registration process'
    },
    {
      id: 4,
      message: 'Tell me about dashboard features',
      expectedKeywords: ['dashboard', 'events', 'manage'],
      description: 'Dashboard functionality'
    }
  ];

  // Check RAG system status
  const checkRAGStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_LINK || 'http://localhost:5000'}/api/chat-status`);
      if (response.ok) {
        const data = await response.json();
        setRagStatus(data);
      }
    } catch (error) {
      console.error('RAG status check failed:', error);
    }
  };

  // Test chatbot API with RAG (same as your Chatbot.jsx)
  const testChatbotAPI = async (testCase) => {
    setIsLoading(true);
    
    try {
      const startTime = Date.now();
      
      // Exact same API call as your Chatbot.jsx
      const response = await fetch(`${import.meta.env.VITE_BACKEND_LINK || 'http://localhost:5000'}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testCase.message,
          conversationHistory: [] // Empty for test
        })
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (data.success) {
        // Analyze response for RAG effectiveness
        const response_lower = data.response.toLowerCase();
        const foundKeywords = testCase.expectedKeywords.filter(keyword =>
          response_lower.includes(keyword.toLowerCase())
        );

        const hasRAGIndicators = response_lower.includes('campuscrew') ||
                                response_lower.includes('event') ||
                                response_lower.includes('registration') ||
                                response_lower.includes('dashboard');

        const result = {
          ...testCase,
          success: true,
          response: data.response,
          responseTime,
          model: data.model,
          keywordMatch: foundKeywords.length / testCase.expectedKeywords.length,
          foundKeywords,
          hasRAGContent: hasRAGIndicators,
          responseLength: data.response.length,
          quality: assessResponseQuality(data.response)
        };

        return result;
      } else {
        return {
          ...testCase,
          success: false,
          error: data.error,
          responseTime
        };
      }
    } catch (error) {
      return {
        ...testCase,
        success: false,
        error: error.message,
        responseTime: 0
      };
    } finally {
      setIsLoading(false);
    }
  };

  const assessResponseQuality = (response) => {
    if (response.length < 50) return 'TOO_SHORT';
    if (response.length > 1000) return 'TOO_LONG';
    if (response.includes("I don't know") || response.includes("I'm not sure")) return 'UNCERTAIN';
    if (response.includes('CampusCrew') || response.includes('event')) return 'EXCELLENT';
    return 'GOOD';
  };

  // Run all tests
  const runTests = async () => {
    setTestResults([]);
    setIsLoading(true);

    const results = [];
    for (const testCase of testCases) {
      const result = await testChatbotAPI(testCase);
      results.push(result);
      setTestResults([...results]); // Update UI progressively
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    checkRAGStatus();
  }, []);

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'EXCELLENT': return '#4ade80';
      case 'GOOD': return '#60a5fa';
      case 'UNCERTAIN': return '#f59e0b';
      case 'TOO_SHORT': return '#ef4444';
      case 'TOO_LONG': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🤖 CampusCrew RAG Chatbot Tester</h1>
      <p>This tool tests your chatbot's RAG integration using the same API calls as your React Chatbot component.</p>

      {/* RAG Status */}
      <div style={{ 
        background: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '20px' 
      }}>
        <h3>📊 RAG System Status</h3>
        {ragStatus ? (
          <div>
            <p>✅ Backend Connected</p>
            <pre>{JSON.stringify(ragStatus, null, 2)}</pre>
          </div>
        ) : (
          <p>⚠️ Checking status... (Make sure backend is running on port 5000)</p>
        )}
      </div>

      {/* Test Controls */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={runTests}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {isLoading ? '🔄 Testing...' : '🧪 Run RAG Tests'}
        </button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div>
          <h3>📋 Test Results ({testResults.length}/{testCases.length})</h3>
          
          {testResults.map((result, index) => (
            <div
              key={result.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                backgroundColor: result.success ? '#f0fdf4' : '#fef2f2'
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: result.success ? '#059669' : '#dc2626', margin: '0 0 8px 0' }}>
                  {result.success ? '✅' : '❌'} {result.description}
                </h4>
                <p style={{ margin: '0', color: '#6b7280' }}>
                  Query: "{result.message}"
                </p>
              </div>

              {result.success ? (
                <div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '12px', 
                    marginBottom: '12px' 
                  }}>
                    <div>
                      <strong>Response Time:</strong> {result.responseTime}ms
                    </div>
                    <div>
                      <strong>Model:</strong> {result.model || 'Unknown'}
                    </div>
                    <div>
                      <strong>Length:</strong> {result.responseLength} chars
                    </div>
                    <div style={{ color: getQualityColor(result.quality) }}>
                      <strong>Quality:</strong> {result.quality}
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div>
                      <strong>RAG Effectiveness:</strong>
                    </div>
                    <div style={{ marginLeft: '16px' }}>
                      <div>🎯 Keyword Match: {(result.keywordMatch * 100).toFixed(0)}% ({result.foundKeywords.join(', ')})</div>
                      <div>🤖 Contains CampusCrew Context: {result.hasRAGContent ? 'YES' : 'NO'}</div>
                    </div>
                  </div>

                  <div>
                    <strong>Response:</strong>
                    <div style={{ 
                      background: '#f8fafc', 
                      padding: '12px', 
                      borderRadius: '6px', 
                      marginTop: '8px',
                      maxHeight: '150px',
                      overflow: 'auto',
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {result.response}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#dc2626' }}>
                  <strong>Error:</strong> {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div style={{ 
        background: '#fffbeb', 
        border: '1px solid #f59e0b', 
        borderRadius: '8px', 
        padding: '16px', 
        marginTop: '20px' 
      }}>
        <h3>💡 How to Verify RAG Integration:</h3>
        <ol>
          <li><strong>Start Backend:</strong> <code>cd backend && npm start</code></li>
          <li><strong>Check Status:</strong> Look for RAG system initialization in backend logs</li>
          <li><strong>Run Tests:</strong> Click "Run RAG Tests" above</li>
          <li><strong>Verify Results:</strong> 
            <ul>
              <li>✅ <strong>Response Time:</strong> Should be under 2000ms</li>
              <li>✅ <strong>Keyword Match:</strong> Should be above 50%</li>
              <li>✅ <strong>RAG Content:</strong> Should contain CampusCrew-specific information</li>
              <li>✅ <strong>Quality:</strong> Should be "EXCELLENT" or "GOOD"</li>
            </ul>
          </li>
          <li><strong>Test in Real Chatbot:</strong> Open your actual chatbot component and ask the same questions</li>
        </ol>
      </div>
    </div>
  );
};

export default RAGTester;