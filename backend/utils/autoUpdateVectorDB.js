require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { QdrantClient } = require('@qdrant/js-client-rest');
const UnifiedEmbeddingService = require('./unifiedEmbeddingService_smol');

// Initialize clients
const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
});

const embeddingService = new UnifiedEmbeddingService();

const COLLECTION_NAME = 'campuscrew_docs';
const CONTENT_DIR = path.join(__dirname, '..', 'data', 'website_content');

/**
 * Check if Qdrant database needs updating
 * Returns object with: { needsUpdate: boolean, reason: string, stats: object }
 */
async function checkDatabaseFreshness() {
    try {
        console.log('   📊 Checking database freshness...');
        
        // Get all points from Qdrant
        let allPoints = [];
        let offset = null;
        
        do {
            const response = await qdrantClient.scroll(COLLECTION_NAME, {
                limit: 100,
                offset: offset,
                with_payload: true,
                with_vector: false,
            });
            
            allPoints = allPoints.concat(response.points);
            offset = response.next_page_offset;
        } while (offset !== null && offset !== undefined);

        if (allPoints.length === 0) {
            return { 
                needsUpdate: true, 
                reason: 'Database is empty',
                stats: { total: 0, duplicates: 0, oldDocs: 0 }
            };
        }

        // Check for duplicates
        const sourceGroups = {};
        allPoints.forEach(point => {
            const source = point.payload?.source || 'unknown';
            sourceGroups[source] = (sourceGroups[source] || 0) + 1;
        });

        const duplicates = Object.entries(sourceGroups).filter(([_, count]) => count > 1);
        
        // Check for old data (> 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        let oldDocs = 0;
        allPoints.forEach(point => {
            const uploadedAt = point.payload?.uploadedAt;
            if (uploadedAt) {
                const uploadDate = new Date(uploadedAt);
                if (uploadDate < thirtyDaysAgo) {
                    oldDocs++;
                }
            }
        });

        const stats = {
            total: allPoints.length,
            duplicates: duplicates.length,
            oldDocs: oldDocs
        };

        // Decide if update is needed
        if (duplicates.length > 0) {
            return { 
                needsUpdate: true, 
                reason: `Found ${duplicates.length} duplicate documents`,
                stats 
            };
        }

        if (oldDocs > 0) {
            return { 
                needsUpdate: true, 
                reason: `Found ${oldDocs} documents older than 30 days`,
                stats 
            };
        }

        console.log('   ✅ Database is fresh (no duplicates, no old data)');
        return { 
            needsUpdate: false, 
            reason: 'Database is fresh',
            stats 
        };

    } catch (error) {
        console.error('   ⚠️  Error checking database:', error.message);
        return { 
            needsUpdate: true, 
            reason: `Error checking database: ${error.message}`,
            stats: {} 
        };
    }
}

/**
 * Remove all old/duplicate data from Qdrant
 */
async function cleanOldData() {
    try {
        console.log('   🗑️  Removing old data...');
        
        // Get all point IDs
        let allIds = [];
        let offset = null;
        
        do {
            const response = await qdrantClient.scroll(COLLECTION_NAME, {
                limit: 100,
                offset: offset,
                with_payload: false,
                with_vector: false,
            });
            
            allIds = allIds.concat(response.points.map(p => p.id));
            offset = response.next_page_offset;
        } while (offset !== null && offset !== undefined);

        if (allIds.length === 0) {
            console.log('   ℹ️  No data to remove');
            return 0;
        }

        // Delete in batches of 100
        const batchSize = 100;
        let totalDeleted = 0;

        for (let i = 0; i < allIds.length; i += batchSize) {
            const batch = allIds.slice(i, i + batchSize);
            await qdrantClient.delete(COLLECTION_NAME, {
                points: batch
            });
            totalDeleted += batch.length;
        }

        console.log(`   ✅ Removed ${totalDeleted} old documents`);
        return totalDeleted;

    } catch (error) {
        console.error('   ❌ Error cleaning old data:', error.message);
        throw error;
    }
}

/**
 * Upload fresh content to Qdrant
 */
async function uploadFreshContent() {
    try {
        console.log('   📤 Uploading fresh content...');
        
        // Read all text files
        const files = await fs.readdir(CONTENT_DIR);
        const textFiles = files.filter(f => f.endsWith('.txt'));

        if (textFiles.length === 0) {
            console.log('   ⚠️  No content files found');
            return 0;
        }

        let allDocuments = [];
        
        // Read each file
        for (const file of textFiles) {
            const filePath = path.join(CONTENT_DIR, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const source = file.replace('.txt', '');
            
            // Split into chunks if content is large
            const chunkSize = 1000;
            if (content.length > chunkSize) {
                const chunks = [];
                for (let i = 0; i < content.length; i += chunkSize) {
                    chunks.push(content.slice(i, i + chunkSize));
                }
                
                chunks.forEach((chunk, index) => {
                    allDocuments.push({
                        text: chunk,
                        source: `${source}-chunk-${index}`,
                        originalSource: source,
                        chunkIndex: index,
                        totalChunks: chunks.length
                    });
                });
            } else {
                allDocuments.push({
                    text: content,
                    source: source,
                    originalSource: source
                });
            }
        }

        console.log(`   📝 Processing ${allDocuments.length} documents...`);

        // Generate embeddings in batches
        const batchSize = 96; // Cohere limit
        let uploadedCount = 0;
        const uploadBatch = Date.now().toString();
        const dataVersion = 'v1.0';
        const uploadedAt = new Date().toISOString();

        for (let i = 0; i < allDocuments.length; i += batchSize) {
            const batch = allDocuments.slice(i, i + batchSize);

            // Prepare points for Qdrant
            const points = [];
            
            for (const doc of batch) {
                // Generate embedding for each document
                const embedding = await embeddingService.generateEmbedding(doc.text);
                
                points.push({
                    id: crypto.randomUUID(),
                    vector: embedding,
                    payload: {
                        text: doc.text,
                        source: doc.source,
                        originalSource: doc.originalSource,
                        chunkIndex: doc.chunkIndex,
                        totalChunks: doc.totalChunks,
                        uploadedAt: uploadedAt,
                        dataVersion: dataVersion,
                        uploadBatch: uploadBatch,
                        isLatest: true
                    }
                });
            }

            // Upload to Qdrant
            await qdrantClient.upsert(COLLECTION_NAME, {
                wait: true,
                points: points
            });

            uploadedCount += points.length;
            
            // Show progress
            if (uploadedCount % 10 === 0 || uploadedCount === allDocuments.length) {
                process.stdout.write(`\r   📤 Uploaded: ${uploadedCount}/${allDocuments.length}`);
            }
        }

        console.log(`\n   ✅ Successfully uploaded ${uploadedCount} documents`);
        return uploadedCount;

    } catch (error) {
        console.error('   ❌ Error uploading content:', error.message);
        throw error;
    }
}

/**
 * Main function: Automatically update vector database if needed
 * Called on server startup
 */
async function autoUpdateVectorDB() {
    console.log('\n🔄 AUTO-UPDATE: Checking vector database...\n');
    
    try {
        // Step 1: Check if update is needed
        const { needsUpdate, reason, stats } = await checkDatabaseFreshness();
        
        console.log(`   📊 Current state: ${stats.total} documents`);
        
        if (!needsUpdate) {
            console.log('   ✅ No update needed - database is fresh!\n');
            return {
                success: true,
                updated: false,
                message: 'Database is already up to date'
            };
        }

        console.log(`   ⚠️  Update needed: ${reason}\n`);

        // Step 2: Clean old data
        const deletedCount = await cleanOldData();
        
        // Step 3: Upload fresh content
        const uploadedCount = await uploadFreshContent();

        console.log('\n   ✅ AUTO-UPDATE COMPLETE!');
        console.log(`   📊 Removed: ${deletedCount} | Uploaded: ${uploadedCount}\n`);

        return {
            success: true,
            updated: true,
            deletedCount,
            uploadedCount,
            message: 'Database updated successfully'
        };

    } catch (error) {
        console.error('\n   ❌ AUTO-UPDATE FAILED:', error.message);
        console.error('   ⚠️  Server will continue with existing data\n');
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Force update (always clean and re-upload)
 * Use this for manual updates or when you know content changed
 */
async function forceUpdateVectorDB() {
    console.log('\n🔄 FORCE UPDATE: Refreshing vector database...\n');
    
    try {
        const deletedCount = await cleanOldData();
        const uploadedCount = await uploadFreshContent();

        console.log('\n   ✅ FORCE UPDATE COMPLETE!');
        console.log(`   📊 Removed: ${deletedCount} | Uploaded: ${uploadedCount}\n`);

        return {
            success: true,
            deletedCount,
            uploadedCount
        };

    } catch (error) {
        console.error('\n   ❌ FORCE UPDATE FAILED:', error.message, '\n');
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    autoUpdateVectorDB,
    forceUpdateVectorDB,
    checkDatabaseFreshness,
    cleanOldData,
    uploadFreshContent
};
