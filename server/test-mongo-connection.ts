import { connectToMongo } from './mongodb';

async function testConnection() {
  try {
    await connectToMongo();
    console.log('Successfully connected to MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Failed to connect:', error);
    process.exit(1);
  }
}

testConnection();