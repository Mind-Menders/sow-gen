import { MongoClient } from 'mongodb';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/inspect-user.js <email>');
    process.exit(2);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sow_gen';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('sow_generator'); // Use the correct database name
    const users = db.collection('users');
    const user = await users.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return;
    }

    // Print key fields for debugging
    console.log('Found user:');
    console.log('  _id:', user._id);
    console.log('  email:', user.email);
    console.log('  name:', user.name || '(empty)');
    console.log('  firstName:', user.firstName || '(empty)');
    console.log('  lastName:', user.lastName || '(empty)');
    console.log('  role:', user.role);
    console.log('  isActive:', user.isActive);
    console.log('  forcePasswordChange:', user.forcePasswordChange);
    console.log('  password (raw):', user.password || '(empty)');
    console.log('\nFull document:');
    console.log(JSON.stringify(user, null, 2));
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  } finally {
    await client.close();
  }
}

main();
