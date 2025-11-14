// Quick script to check audit logs in MongoDB
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sow_gen';

async function checkAuditLogs() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const auditTrail = db.collection('sow_audit_trail');
    
    // Count total audit entries
    const count = await auditTrail.countDocuments();
    console.log(`\nTotal audit entries: ${count}`);
    
    // Get recent audit entries
    const recentEntries = await auditTrail.find().sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log('\nRecent audit entries:');
    console.log('='.repeat(80));
    
    for (const entry of recentEntries) {
      console.log(`\nID: ${entry._id}`);
      console.log(`SOW ID: ${entry.sowId}`);
      console.log(`Action: ${entry.action}`);
      console.log(`Performed By: ${entry.performedBy}`);
      console.log(`Remarks: ${entry.remarks}`);
      console.log(`Created At: ${entry.createdAt}`);
      if (entry.metadata) {
        console.log(`Metadata: ${entry.metadata}`);
      }
      console.log('-'.repeat(80));
    }
    
    // Count version_increment entries
    const versionIncrementCount = await auditTrail.countDocuments({ action: 'version_increment' });
    console.log(`\nVersion increment entries: ${versionIncrementCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAuditLogs();
