import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sow_generator";

async function checkSowStatus() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('sow_generator');
    const sowId = '6905d141331770b32ec6d425';
    
    // Get SOW
    const sow = await db.collection('sows').findOne({ 
      _id: ObjectId.createFromHexString(sowId) 
    });
    
    console.log('\n=== SOW Details ===');
    console.log('ID:', sowId);
    console.log('Status:', sow?.status);
    console.log('Title:', sow?.title);
    
    // Get Approvals
    const approvals = await db.collection('sow_approvals')
      .find({ sowId })
      .toArray();
    
    console.log('\n=== Approvals ===');
    approvals.forEach(a => {
      console.log(`Stage ${a.currentStage}: ${a.status}`, a.reviewedAt ? `(reviewed at ${a.reviewedAt})` : '');
    });
    
    // Determine what status should be
    const hasReviewedOrApproved = approvals.some(a => 
      a.status === 'reviewed' || a.status === 'approved'
    );
    const isNotRejectedOrCompleted = sow?.status !== 'rejected' && sow?.status !== 'ready_for_submission';
    const shouldBeInReview = hasReviewedOrApproved && isNotRejectedOrCompleted;
    
    console.log('\n=== Status Analysis ===');
    console.log('Has reviewed/approved approvals:', hasReviewedOrApproved);
    console.log('Is not rejected/completed:', isNotRejectedOrCompleted);
    console.log('Should be "in_review":', shouldBeInReview);
    console.log('Current status:', sow?.status);
    console.log('Status needs update:', shouldBeInReview && sow?.status !== 'in_review');
    
    // Update if needed
    if (shouldBeInReview && sow?.status !== 'in_review') {
      console.log('\n=== Updating SOW Status ===');
      const result = await db.collection('sows').updateOne(
        { _id: ObjectId.createFromHexString(sowId) },
        { $set: { status: 'in_review', updatedAt: new Date() } }
      );
      console.log('Update result:', result.modifiedCount, 'document(s) modified');
      
      // Add audit trail entry
      await db.collection('sow_audit_trail').insertOne({
        _id: new ObjectId(),
        sowId,
        action: 'status_change',
        performedBy: 'system',
        previousStatus: sow?.status,
        newStatus: 'in_review',
        remarks: 'Auto-corrected status to match approval state',
        metadata: null,
        createdAt: new Date(),
      });
      console.log('Audit entry created');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

checkSowStatus();
