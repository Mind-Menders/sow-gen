import { MongoClient } from 'mongodb';
import { hash } from 'bcrypt';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'sow_generator';

async function resetPassword() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const users = db.collection('users');
    
    // List all users
    const allUsers = await users.find({}).toArray();
    console.log(`\nFound ${allUsers.length} user(s):\n`);
    
    for (const user of allUsers) {
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.firstName || ''} ${user.lastName || ''}`);
      console.log(`Role: ${user.role || 'user'}`);
      console.log(`Active: ${user.isActive}`);
      console.log('---');
    }
    
    // Update harry.viswa@gmail.com password to admin123
    const hashedPassword = await hash('admin123', 10);
    const result = await users.updateOne(
      { email: 'harry.viswa@gmail.com' },
      { 
        $set: { 
          password: hashedPassword,
          role: 'admin',
          isActive: true,
          forcePasswordChange: false
        } 
      }
    );
    
    if (result.matchedCount > 0) {
      console.log('\n✅ Password updated successfully for harry.viswa@gmail.com');
      console.log('');
      console.log('Login credentials:');
      console.log('  Email: harry.viswa@gmail.com');
      console.log('  Password: admin123');
      console.log('');
      console.log('Access your application at: http://localhost:5000');
    } else {
      console.log('User not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

resetPassword();
