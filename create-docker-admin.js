import { MongoClient } from 'mongodb';
import { hash } from 'bcrypt';

// Connect to Docker MongoDB
const MONGODB_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'sow_generator';

async function createAdminInDocker() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Connected to Docker MongoDB');
    
    const db = client.db(DB_NAME);
    const users = db.collection('users');
    
    // Check existing users first
    const existingCount = await users.countDocuments({});
    console.log(`\nFound ${existingCount} existing user(s) in Docker MongoDB\n`);
    
    // Create admin@example.com if it doesn't exist
    const adminExists = await users.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      const hashedPassword = await hash('admin123', 10);
      await users.insertOne({
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        forcePasswordChange: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✓ Created admin@example.com');
    } else {
      console.log('✓ admin@example.com already exists');
    }
    
    // Create harry.viswa@gmail.com if it doesn't exist
    const harryExists = await users.findOne({ email: 'harry.viswa@gmail.com' });
    if (!harryExists) {
      const hashedPassword = await hash('admin123', 10);
      await users.insertOne({
        email: 'harry.viswa@gmail.com',
        password: hashedPassword,
        firstName: 'Harry',
        lastName: 'Viswa',
        name: 'Harry Viswa',
        role: 'admin',
        isActive: true,
        forcePasswordChange: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✓ Created harry.viswa@gmail.com');
    } else {
      console.log('✓ harry.viswa@gmail.com already exists');
    }
    
    // List all users
    const allUsers = await users.find({}).toArray();
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`Total users in Docker MongoDB: ${allUsers.length}`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);
    
    for (const user of allUsers) {
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.firstName || ''} ${user.lastName || ''}`);
      console.log(`Role: ${user.role || 'user'}`);
      console.log(`Active: ${user.isActive ? 'Yes' : 'No'}`);
      console.log('─'.repeat(60));
    }
    
    console.log('\n\n🔑 LOGIN CREDENTIALS:\n');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('\n   OR\n');
    console.log('Email: harry.viswa@gmail.com');
    console.log('Password: admin123');
    console.log('\nAccess: http://localhost:5000\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createAdminInDocker();
