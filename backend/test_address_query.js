/**
 * Quick test to verify address query intent classification
 */

const intentClassifier = require('./utils/intentClassifier');

// Test queries
const testQueries = [
  "give me campuscrew address",
  "what is campuscrew address",
  "campuscrew address",
  "tell me the address of campuscrew",
  "where is campuscrew located",
  "campuscrew phone number",
  "campuscrew email",
  "contact information"
];

console.log('🧪 Testing Address Query Intent Classification\n');
console.log('='.repeat(60));

testQueries.forEach(query => {
  const result = intentClassifier.classifyIntent(query);
  const strategy = intentClassifier.getResponseStrategy(result);
  
  console.log(`\n📝 Query: "${query}"`);
  console.log(`🎯 Intent: ${result.intent}`);
  console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`📋 Strategy: ${strategy.type}`);
  console.log(`🔍 Use Database: ${strategy.useDatabase}`);
  console.log(`🔍 Use RAG: ${strategy.useRAG}`);
});

console.log('\n' + '='.repeat(60));
console.log('\n✅ Test complete! All address queries should show:');
console.log('   - Intent: GENERAL_QUESTION');
console.log('   - Strategy: rag');
console.log('   - Use RAG: true\n');
