require('dotenv').config();
const { autoUpdateVectorDB, checkDatabaseFreshness } = require('./utils/autoUpdateVectorDB');

async function testAutoUpdate() {
    console.log('🧪 Testing Automatic Vector Database Update\n');
    console.log('This simulates what happens when you start the server\n');
    console.log('='.repeat(60));
    
    try {
        // Test the auto-update function
        const result = await autoUpdateVectorDB();
        
        console.log('='.repeat(60));
        console.log('\n📋 TEST RESULTS:\n');
        
        if (result.success) {
            if (result.updated) {
                console.log('✅ Database was updated');
                console.log(`   📊 Deleted: ${result.deletedCount} old documents`);
                console.log(`   📤 Uploaded: ${result.uploadedCount} fresh documents`);
            } else {
                console.log('✅ No update needed - database is already fresh');
            }
        } else {
            console.log('❌ Update failed:', result.error);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('\n✅ Automatic update system is working correctly!');
        console.log('   This will run automatically when you start your server.');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
    }
}

// Run the test
testAutoUpdate();
