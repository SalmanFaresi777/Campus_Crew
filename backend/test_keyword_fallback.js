/**
 * Test the keyword fallback for contact queries
 */

const fs = require('fs').promises;
const path = require('path');

async function getSimpleContext(query) {
  try {
    const dataDir = path.join(__dirname, 'data', 'website_content');
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

    return null;
  } catch (error) {
    console.error('Simple context error:', error.message);
    return null;
  }
}

async function testKeywordFallback() {
  console.log('🧪 Testing Keyword Fallback for Contact Queries\n');
  console.log('='.repeat(70));
  
  const testQueries = [
    "give me campuscrew address",
    "what is the phone number?",
    "campuscrew contact information",
    "how to reach campuscrew",
    "campuscrew email"
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log('-'.repeat(70));
    
    const context = await getSimpleContext(query);
    
    if (context) {
      const hasAddress = context.includes('141 & 142');
      const hasPhone = context.includes('01924753893');
      const hasEmail = context.includes('campuscrew@gmail.com');
      
      console.log(`✅ Context retrieved: ${context.length} chars`);
      console.log(`   Has address: ${hasAddress ? '✅' : '❌'}`);
      console.log(`   Has phone: ${hasPhone ? '✅' : '❌'}`);
      console.log(`   Has email: ${hasEmail ? '✅' : '❌'}`);
      console.log(`\n   Preview: ${context.substring(0, 200)}...`);
      
      if (hasAddress && hasPhone && hasEmail) {
        console.log(`\n   ✅ SUCCESS: All contact info present!`);
      } else {
        console.log(`\n   ⚠️  WARNING: Missing some contact info`);
      }
    } else {
      console.log(`❌ No context retrieved`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Test complete!\n');
}

testKeywordFallback().catch(console.error);
