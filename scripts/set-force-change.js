// Quick script to set forcePasswordChange=true for a specific user
import { MongoClient } from 'mongodb';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/set-force-change.js <email>');
    process.exit(2);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sow_gen';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('sow_generator'); // Use the correct database name
    const users = db.collection('users');

    const result = await users.updateOne(
      { email },
      { $set: { forcePasswordChange: true } }
    );

    if (result.matchedCount === 0) {
      console.log('User not found for email:', email);
    } else {
      console.log('Updated forcePasswordChange=true for user:', email);
    }
  } catch (err) {
    console.error('Error updating MongoDB:', err);
  } finally {
    await client.close();
  }
}

main();