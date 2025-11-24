import pkg from 'mongodb';
const { MongoClient } = pkg;
import { hash } from 'bcrypt';

// Connect to Docker MongoDB at port 27017
const MONGODB_URI = 'mongodb://127.0.0.1:27017/sow_generator';

async function insertAdmin() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Connected to Docker MongoDB');
    
    const db = client.db('sow_generator');
    const users = db.collection('users');
    
    // Remove existing admin users if they exist (to avoid duplicates)
    await users.deleteMany({ email: { $in: ['admin@example.com', 'harry.viswa@gmail.com'] } });
    
    // Create new hashed password
    const hashedPassword = await hash('admin123', 10);
    
    // Insert admin users
    const result = await users.insertMany([
      {
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
      },
      {
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
      }
    ]);
    
    console.log(`✓ Inserted ${result.insertedCount} admin users`);
    
    // Verify
    const allUsers = await users.find({}).toArray();
    console.log(`\n📋 Total users in Docker MongoDB: ${allUsers.length}\n`);
    
    for (const user of allUsers) {
      console.log(`  ${user.email} - ${user.role || 'user'} ${user.email.includes('admin') || user.email.includes('harry') ? '⭐' : ''}`);
    }
    
    console.log('\n✅ SUCCESS! You can now login with:\n');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
    console.log('\n  OR\n');
    console.log('  Email: harry.viswa@gmail.com');
    console.log('  Password: admin123');
    console.log('\n🌐 Access: http://localhost:5000\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

insertAdmin();
