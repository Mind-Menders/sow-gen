import { MongoClient } from 'mongodb';
import { compare } from 'bcrypt';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'sow_generator';

async function checkUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const users = db.collection('users');
    
    // List all users with their details
    const allUsers = await users.find({}).toArray();
    console.log(`Found ${allUsers.length} user(s) in database:\n`);
    console.log('═'.repeat(80));
    
    for (const user of allUsers) {
      console.log(`\nEmail: ${user.email}`);
      console.log(`First Name: ${user.firstName || '(not set)'}`);
      console.log(`Last Name: ${user.lastName || '(not set)'}`);
      console.log(`Role: ${user.role || 'user'}`);
      console.log(`Active: ${user.isActive === true ? 'Yes' : 'No'}`);
      console.log(`Has Password: ${user.password ? 'Yes' : 'No'}`);
      console.log(`Password Hash (first 20 chars): ${user.password ? user.password.substring(0, 20) + '...' : 'N/A'}`);
      console.log(`Force Change Password: ${user.forcePasswordChange === true ? 'Yes' : 'No'}`);
      
      // Test password verification
      if (user.password) {
        try {
          const testAdmin123 = await compare('admin123', user.password);
          const testAdmin = await compare('admin', user.password);
          console.log(`Password 'admin123' matches: ${testAdmin123 ? 'YES ✓' : 'NO ✗'}`);
          console.log(`Password 'admin' matches: ${testAdmin ? 'YES ✓' : 'NO ✗'}`);
        } catch (err) {
          console.log(`Error testing password: ${err.message}`);
        }
      }
      
      console.log('─'.repeat(80));
    }
    
    console.log('\n\n🔑 CREDENTIALS TO TRY:\n');
    console.log('Option 1:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123\n');
    
    console.log('Option 2:');
    console.log('  Email: harry.viswa@gmail.com');
    console.log('  Password: admin123\n');
    
    console.log('Access your application at: http://localhost:5000\n');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

checkUsers();
