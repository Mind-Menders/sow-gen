import { MongoClient } from 'mongodb';
import { hash } from 'bcrypt';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'sow_generator';

async function createAdmin() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const users = db.collection('users');
    
    // Check if admin already exists
    const existingAdmin = await users.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log('Email: admin@example.com');
      console.log('Note: Use password "admin123" if not changed');
      return;
    }
    
    // Create admin user
    const hashedPassword = await hash('admin123', 10);
    const result = await users.insertOne({
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      name: 'Admin User',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
    console.log('');
    console.log('Access your application at: http://localhost:5000');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createAdmin();
