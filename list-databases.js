import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://127.0.0.1:27017';

async function listDatabases() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');
    
    // List all databases
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();
    
    console.log('All databases:');
    console.log('═'.repeat(80));
    for (const dbInfo of databases) {
      console.log(`\nDatabase: ${dbInfo.name} (${(dbInfo.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
      
      // Check for users collection in each database
      const db = client.db(dbInfo.name);
      try {
        const collections = await db.listCollections().toArray();
        const hasUsers = collections.some(c => c.name === 'users');
        
        if (hasUsers) {
          const users = db.collection('users');
          const userCount = await users.countDocuments({});
          console.log(`  ✓ Has 'users' collection with ${userCount} user(s)`);
          
          if (userCount > 0) {
            const allUsers = await users.find({}).toArray();
            console.log(`  Users:`);
            for (const user of allUsers) {
              console.log(`    - ${user.email} (${user.role || 'user'})`);
            }
          }
        }
      } catch (err) {
        console.log(`  Error checking collections: ${err.message}`);
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 The Docker app is configured to use: mongodb://mongo:27017/sow_generator');
    console.log('   This means it uses database "sow_generator"\n');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

listDatabases();
