# Docker Setup - Auto-Admin User Creation

## Summary

The application now **automatically creates default admin users** when starting with a fresh MongoDB database.

## Default Admin Accounts

When the MongoDB database is empty, the following admin accounts are created automatically:

### Primary Admin
- **Email:** `admin@example.com`
- **Password:** `admin123`
- **Role:** admin

### Secondary Admin
- **Email:** `harry.viswa@gmail.com`
- **Password:** `admin123`
- **Role:** admin

## How It Works

The auto-creation happens in two places:

### 1. MongoDB Storage Initialization (`server/mongo-storage.ts`)
- Checks if the `users` collection is empty
- If empty, creates 2 admin users with hashed passwords
- Uses bcrypt with 10 salt rounds for password hashing

### 2. Auth Router Initialization (`server/auth.ts`)
- Double-checks for admin users after storage initialization
- Creates additional admin users if none exist
- Provides backup safety net in case storage seeding fails

## Usage

### Start Fresh Environment
```bash
# Stop containers and remove volumes
docker compose down -v

# Start with fresh database
docker compose up --build -d
```

### View Logs
```bash
# Check that admin users were created
docker logs sow-gen-app | grep "MongoDB Storage"
```

You should see:
```
[MongoDB Storage] ✓ Created 2 default admin users:
[MongoDB Storage]   - admin@example.com (password: admin123)
[MongoDB Storage]   - harry.viswa@gmail.com (password: admin123)
```

## Security Notes

⚠️ **Important:** Change the default password `admin123` immediately after first login in a production environment.

The default credentials are only created when the database is completely empty. If any users exist, no default users will be created.

## Verification

To verify users were created correctly:

```bash
# Check users in MongoDB
docker exec sow-gen-mongo mongosh sow_generator --eval "db.users.find({}, {email: 1, role: 1}).toArray()"

# Or use the verification script
node check-users.js
```

## Access Application

Once the containers are running:
- **URL:** http://localhost:5000
- **Login:** Use either admin account listed above
