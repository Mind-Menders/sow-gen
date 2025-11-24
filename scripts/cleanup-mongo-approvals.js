/**
 * Direct MongoDB script to clean up duplicate approvals
 * Run with: node scripts/cleanup-mongo-approvals.js
 */

import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sow-gen';

async function cleanupDuplicates() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    const sowsCollection = db.collection('sows');
    const approvalsCollection = db.collection('sowApprovals');
    
    // Get all SOWs
    const sows = await sowsCollection.find({}).toArray();
    console.log(`📋 Found ${sows.length} SOWs\n`);
    
    let totalDuplicates = 0;
    let totalDeleted = 0;
    
    for (const sow of sows) {
      const sowId = sow._id.toString();
      console.log(`🔍 Checking SOW: ${sow.sowNumber} - ${sow.title}`);
      
      // Get all approvals for this SOW
      const approvals = await approvalsCollection.find({ sowId }).toArray();
      
      if (approvals.length === 0) {
        console.log(`   ℹ️  No approvals found\n`);
        continue;
      }
      
      // Find duplicates based on currentStage:reviewerId
      const seen = new Map();
      const toDelete = [];
      
      for (const approval of approvals) {
        const key = `${approval.currentStage}:${approval.reviewerId}`;
        const existing = seen.get(key);
        
        if (!existing) {
          seen.set(key, approval);
        } else {
          // Determine which to keep
          let keepExisting = true;
          
          // Prefer the one with reviewedAt
          if (approval.reviewedAt && !existing.reviewedAt) {
            // Delete existing, keep new
            toDelete.push(existing._id);
            seen.set(key, approval);
            keepExisting = false;
          } else if (!approval.reviewedAt && existing.reviewedAt) {
            // Keep existing, delete new
            toDelete.push(approval._id);
          } else if (approval.reviewedAt && existing.reviewedAt) {
            // Both reviewed, keep the more recent
            if (new Date(approval.reviewedAt) > new Date(existing.reviewedAt)) {
              toDelete.push(existing._id);
              seen.set(key, approval);
            } else {
              toDelete.push(approval._id);
            }
          } else {
            // Neither reviewed, keep the first one
            toDelete.push(approval._id);
          }
        }
      }
      
      if (toDelete.length > 0) {
        console.log(`   🗑️  Found ${toDelete.length} duplicates`);
        
        // Delete the duplicates
        const result = await approvalsCollection.deleteMany({
          _id: { $in: toDelete }
        });
        
        console.log(`   ✅ Deleted ${result.deletedCount} duplicate approvals`);
        totalDuplicates += toDelete.length;
        totalDeleted += result.deletedCount;
      } else {
        console.log(`   ✅ No duplicates found`);
      }
      console.log('');
    }
    
    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   Total duplicates found: ${totalDuplicates}`);
    console.log(`   Total duplicates removed: ${totalDeleted}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

cleanupDuplicates();
