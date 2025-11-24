import { MongoClient } from 'mongodb';
import { hash } from 'bcrypt';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'sow_generator';

async function createHarryUser() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const users = db.collection('users');
    
    // Check if user already exists
    const existingUser = await users.findOne({ email: 'harry.viswa@gmail.com' });
    if (existingUser) {
      console.log('User harry.viswa@gmail.com already exists');
      return;
    }
    
    // Create Harry's user account
    const hashedPassword = await hash('admin123', 10);
    const result = await users.insertOne({
      email: 'harry.viswa@gmail.com',
      password: hashedPassword,
      firstName: 'Harry',
      lastName: 'Viswa',
      name: 'Harry Viswa',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('✅ User created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email: harry.viswa@gmail.com');
    console.log('  Password: admin123');
    console.log('');
    console.log('Access your application at: http://localhost:5000');
    
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createHarryUser();
