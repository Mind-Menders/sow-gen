// List all users in the database
import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sow_gen';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // List all databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('Available databases:', dbs.databases.map(db => db.name));

    const db = client.db('sow_generator');
    console.log('Using database:', db.databaseName);

    const users = db.collection('users');
    const allUsers = await users.find({}).toArray();

    console.log(`Found ${allUsers.length} users in database:`);
    allUsers.forEach(user => {
      console.log(`- Email: ${user.email}, Name: ${user.name || '(empty)'}, First: ${user.firstName || '(empty)'}, Last: ${user.lastName || '(empty)'}, ForceChange: ${user.forcePasswordChange}`);
    });
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  } finally {
    await client.close();
  }
}

main();