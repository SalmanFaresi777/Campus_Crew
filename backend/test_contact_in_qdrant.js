/**
 * Test if the actual contact.txt content is in Qdrant
 */

const MonitoredVectorService = require('./utils/monitoredVectorService');
require('dotenv').config();

const qdrantService = new MonitoredVectorService({
  collectionName: process.env.QDRANT_COLLECTION || 'campuscrew_docs'
});

async function testContactRetrieval() {
  console.log('🔍 Testing Contact Information in Qdrant\n');
  
  const query = "give me campuscrew address";
  console.log(`📝 Query: "${query}"\n`);
  
  try {
    const result = await qdrantService.searchRelevantDocuments(query, 'test-user');
    
    if (result.success && result.documents.length > 0) {
      console.log(`✅ Found ${result.documents.length} documents\n`);
      
      result.documents.forEach((doc, index) => {
        const score = (doc.score * 100).toFixed(1);
        const content = doc.payload?.content || doc.metadata?.content || '';
        const source = doc.payload?.source || doc.payload?.sourceTitle || doc.metadata?.source || 'Unknown';
        
        console.log(`📄 Document ${index + 1}:`);
        console.log(`   Source: ${source}`);
        console.log(`   Score: ${score}%`);
        console.log(`   Has "141 & 142": ${content.includes('141 & 142') ? '✅ YES' : '❌ NO'}`);
        console.log(`   Has "Love Road": ${content.includes('Love Road') ? '✅ YES' : '❌ NO'}`);
        console.log(`   Has "01924753893": ${content.includes('01924753893') ? '✅ YES' : '❌ NO'}`);
        console.log(`   Content Preview:\n${content.substring(0, 300)}...\n`);
      });
      
      // Check if any document contains the actual address
      const hasCorrectAddress = result.documents.some(doc => {
        const content = doc.payload?.content || doc.metadata?.content || '';
        return content.includes('141 & 142') || content.includes('Love Road');
      });
      
      if (hasCorrectAddress) {
        console.log('✅ SUCCESS: Contact information IS in the database!');
      } else {
        console.log('❌ PROBLEM: Contact information NOT FOUND in retrieved documents!');
        console.log('   This means the vector search is not ranking the contact.txt highly enough.');
      }
      
    } else {
      console.log('❌ No documents found');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testContactRetrieval().catch(console.error);
