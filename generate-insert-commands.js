import { hash } from 'bcrypt';

async function createAdmin() {
  const hashedPassword = await hash('admin123', 10);
  
  const adminUser = {
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
  };
  
  const harryUser = {
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
  };
  
  console.log('db.users.insertOne(' + JSON.stringify(adminUser, null, 2) + ');');
  console.log('db.users.insertOne(' + JSON.stringify(harryUser, null, 2) + ');');
}

createAdmin();
