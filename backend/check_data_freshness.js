/**
 * Check for Old or Duplicate Data in Qdrant
 * Reports data age, duplicates, and versions
 */

const QdrantVectorDB = require('./utils/qdrantVectorDB');
require('dotenv').config();

const qdrantDB = new QdrantVectorDB({
  baseUrl: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  collectionName: process.env.QDRANT_COLLECTION || 'campuscrew_docs',
  vectorSize: 384
});

async function checkDataFreshness() {
  console.log('🔍 Checking Data Freshness in Qdrant\n');
  console.log('='.repeat(70));
  
  try {
    // Get all points
    const scrollRequest = {
      limit: 100,
      with_payload: true,
      with_vector: false
    };
    
    const response = await qdrantDB.makeRequest('POST', `/collections/${qdrantDB.collectionName}/points/scroll`, scrollRequest);
    const points = response.result?.points || [];
    
    console.log(`\n📊 Total documents: ${points.length}\n`);
    
    if (points.length === 0) {
      console.log('⚠️  Database is empty!');
      return;
    }
    
    // Analyze data
    const sourceGroups = {};
    const uploadBatches = {};
    const versions = {};
    const ages = [];
    
    points.forEach(point => {
      const source = point.payload?.source || point.payload?.sourceUrl || 'unknown';
      const uploadBatch = point.payload?.uploadBatch || point.payload?.metadata?.uploadBatch || 'unknown';
      const version = point.payload?.dataVersion || 'v0.0';
      const uploadedAt = point.payload?.uploadedAt || point.payload?.createdAt || null;
      
      // Group by source
      if (!sourceGroups[source]) {
        sourceGroups[source] = [];
      }
      sourceGroups[source].push(point);
      
      // Group by upload batch
      if (!uploadBatches[uploadBatch]) {
        uploadBatches[uploadBatch] = 0;
      }
      uploadBatches[uploadBatch]++;
      
      // Group by version
      if (!versions[version]) {
        versions[version] = 0;
      }
      versions[version]++;
      
      // Calculate age
      if (uploadedAt) {
        const ageInDays = (Date.now() - new Date(uploadedAt).getTime()) / (1000 * 60 * 60 * 24);
        ages.push({ source, ageInDays, uploadedAt });
      }
    });
    
    // Report: Duplicates
    console.log('📋 DUPLICATE CHECK:\n');
    const duplicates = Object.entries(sourceGroups).filter(([_, docs]) => docs.length > 1);
    
    if (duplicates.length > 0) {
      console.log(`   ⚠️  WARNING: Found ${duplicates.length} sources with multiple documents!\n`);
      duplicates.forEach(([source, docs]) => {
        console.log(`   ❌ ${source}: ${docs.length} copies`);
        docs.forEach((doc, idx) => {
          const uploaded = doc.payload?.uploadedAt || doc.payload?.createdAt || 'unknown';
          console.log(`      ${idx + 1}. Uploaded: ${uploaded.substring(0, 19)}`);
        });
      });
      console.log(`\n   💡 Run: node smart_update_vector_db.js to remove duplicates`);
    } else {
      console.log(`   ✅ No duplicates found`);
    }
    
    // Report: Upload batches
    console.log('\n\n📅 UPLOAD BATCHES:\n');
    Object.entries(uploadBatches)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([batch, count]) => {
        console.log(`   ${batch}: ${count} documents`);
      });
    
    // Report: Data versions
    console.log('\n\n🏷️  DATA VERSIONS:\n');
    Object.entries(versions)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([version, count]) => {
        console.log(`   ${version}: ${count} documents`);
      });
    
    if (Object.keys(versions).length > 1) {
      console.log(`\n   ⚠️  WARNING: Multiple versions detected!`);
      console.log(`   💡 Run: node smart_update_vector_db.js to standardize versions`);
    }
    
    // Report: Data age
    console.log('\n\n⏰ DATA AGE:\n');
    
    if (ages.length > 0) {
      ages.sort((a, b) => b.ageInDays - a.ageInDays);
      
      const oldest = ages[0];
      const newest = ages[ages.length - 1];
      const avgAge = ages.reduce((sum, a) => sum + a.ageInDays, 0) / ages.length;
      
      console.log(`   📊 Oldest: ${oldest.source}`);
      console.log(`      Age: ${oldest.ageInDays.toFixed(1)} days`);
      console.log(`      Uploaded: ${oldest.uploadedAt.substring(0, 19)}`);
      
      console.log(`\n   📊 Newest: ${newest.source}`);
      console.log(`      Age: ${newest.ageInDays.toFixed(1)} days`);
      console.log(`      Uploaded: ${newest.uploadedAt.substring(0, 19)}`);
      
      console.log(`\n   📊 Average age: ${avgAge.toFixed(1)} days`);
      
      // Warning for old data
      if (oldest.ageInDays > 7) {
        console.log(`\n   ⚠️  WARNING: Some data is over 7 days old!`);
        console.log(`   💡 Consider running: node smart_update_vector_db.js`);
      } else {
        console.log(`\n   ✅ All data is fresh (< 7 days old)`);
      }
    } else {
      console.log(`   ⚠️  No timestamp information available`);
    }
    
    // Report: Sources
    console.log('\n\n📚 ALL SOURCES:\n');
    Object.keys(sourceGroups)
      .sort()
      .forEach(source => {
        const count = sourceGroups[source].length;
        const marker = count > 1 ? '⚠️ ' : '✅';
        console.log(`   ${marker} ${source} (${count})`);
      });
    
    // Final recommendations
    console.log('\n' + '='.repeat(70));
    console.log('\n📋 RECOMMENDATIONS:\n');
    
    if (duplicates.length > 0) {
      console.log('   ❌ DUPLICATES FOUND - Action required!');
      console.log('      Run: node smart_update_vector_db.js');
    } else if (ages.length > 0 && ages[0].ageInDays > 30) {
      console.log('   ⚠️  DATA IS OLD (30+ days) - Consider updating');
      console.log('      Run: node smart_update_vector_db.js');
    } else if (Object.keys(versions).length > 1) {
      console.log('   ⚠️  MIXED VERSIONS - Consider standardizing');
      console.log('      Run: node smart_update_vector_db.js');
    } else {
      console.log('   ✅ DATA LOOKS GOOD!');
      console.log('      No action needed at this time.');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Check complete!\n');
}

checkDataFreshness().catch(console.error);
