import { Router } from "express";
import { compare, hash } from "bcrypt";

// Prefer MongoDB-backed auth when configured
let usesMongo = false;
let MongoUser: any = null;
let mongoClient: any = null;
let mongoDb: any = null;
let mongoInitialized = false;

async function initializeMongoAuth() {
  if (mongoInitialized) return; // Prevent double initialization

  try {
    if (process.env.MONGODB_URI) {
      usesMongo = true;
      const { MongoClient } = await import("mongodb");
      mongoClient = new MongoClient(process.env.MONGODB_URI);
      await mongoClient.connect();
      mongoDb = mongoClient.db("sow_generator");
      MongoUser = mongoDb.collection("users");
      mongoInitialized = true;
      console.log("Auth: using MongoDB for user storage");
    }
  } catch (err) {
    console.warn("Auth: failed to initialize MongoDB, falling back to Postgres if available", err);
    usesMongo = false;
    MongoUser = null;
  }
}

// If Mongo not available, keep using drizzle-based queries
let drizzleDb: any = null;
let drizzleUsers: any = null;
let drizzleAnd: any = null;
let drizzleEq: any = null;

async function initializeDrizzleAuth() {
  try {
    if (!usesMongo) {
      const d = await import("./db");
      const schema = await import("../shared/schema");
      drizzleDb = d.db;
      drizzleUsers = schema.users;
      const drizzle = await import("drizzle-orm");
      drizzleAnd = drizzle.and;
      drizzleEq = drizzle.eq;
      console.log("Auth: using Postgres (drizzle) for user storage");
    }
  } catch (err) {
    console.warn("Auth: Postgres (drizzle) not available:", err);
  }
}

// Initialize auth systems
async function initializeAuth() {
  await initializeMongoAuth();
  if (!usesMongo) {
    await initializeDrizzleAuth();
  }
}

// Create and export auth router
async function createAuthRouter() {
  await initializeAuth();
  
  const router = Router();

  // Login endpoint
  router.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    try {
      console.log('Login attempt for email:', email);
      let user: any = null;

      if (usesMongo && MongoUser) {
        user = await MongoUser.findOne({ email: email, isActive: true });
      } else if (drizzleDb && drizzleUsers) {
        const [u] = await drizzleDb.select().from(drizzleUsers).where(drizzleAnd(drizzleEq(drizzleUsers.email, email), drizzleEq(drizzleUsers.isActive, true))).limit(1);
        user = u;
      } else {
        return res.status(500).json({ message: "No database configured for authentication" });
      }

      console.log('User found:', user ? 'yes' : 'no');

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      console.log('Verifying password...');
      let isValidPassword = false;
    let forcePasswordChangeSet = false;

      // If there's no password stored, treat this as a first-time login case and accept the default 'admin' password.
      if (!user.password) {
        console.log('User has no password set - treating as first-login default');
        if (password === 'admin') {
          // Migrate to a hashed admin password and mark for forced change on next login
          try {
            const newHash = await hash(password, 10);
            if (usesMongo && MongoUser) {
              await MongoUser.updateOne({ _id: user._id }, { $set: { password: newHash, forcePasswordChange: true } });
              console.log('Set default admin password hash for user (mongo)', user.email);
            } else if (drizzleDb && drizzleUsers) {
              await drizzleDb.update(drizzleUsers).set({ password: newHash, forcePasswordChange: true }).where(drizzleEq(drizzleUsers.id, user.id));
              console.log('Set default admin password hash for user (drizzle)', user.email);
            }
            forcePasswordChangeSet = true;
            isValidPassword = true;
          } catch (err) {
            console.warn('Failed to set default admin password hash:', err);
            return res.status(500).json({ message: 'Internal server error' });
          }
        } else {
          return res.status(401).json({ message: "Invalid credentials" });
        }
      } else {
        isValidPassword = await compare(password, user.password);

        // If bcrypt compare fails, attempt plaintext migration: some users might have plaintext passwords in DB
        if (!isValidPassword) {
          try {
            if (user.password === password) {
              // Stored password appears to be plaintext and matches provided password — migrate to hashed password
              const newHash = await hash(password, 10);
              if (usesMongo && MongoUser) {
                await MongoUser.updateOne({ _id: user._id }, { $set: { password: newHash, forcePasswordChange: true } });
                console.log('Migrated plaintext password to hash for user (mongo)', user.email);
              } else if (drizzleDb && drizzleUsers) {
                await drizzleDb.update(drizzleUsers).set({ password: newHash, forcePasswordChange: true }).where(drizzleEq(drizzleUsers.id, user.id));
                console.log('Migrated plaintext password to hash for user (drizzle)', user.email);
              }
              forcePasswordChangeSet = true;
              isValidPassword = true;
            }
          } catch (migrateErr) {
            console.warn('Password migration failed:', migrateErr);
          }
        }
      }

      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store user in session
      req.session.userId = user.id || user._id;
      
      // Return user without sensitive data
      const id = user.id || user._id;
      const userEmail = user.email;
      const firstName = user.firstName;
      const lastName = user.lastName;
      const role = user.role;
      const name = user.name || `${firstName || ''}${firstName && lastName ? ' ' : ''}${lastName || ''}`.trim();
      const profileImageUrl = user.profileImageUrl || null;
      const mustChangePassword = forcePasswordChangeSet || !!user.forcePasswordChange;

      const responsePayload = { id, email: userEmail, firstName, lastName, name, profileImageUrl, role, mustChangePassword };
      console.log('Login response payload:', JSON.stringify(responsePayload));
      res.json(responsePayload);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user
  router.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userId = req.session.userId;
      let user: any = null;

      if (usesMongo && MongoUser) {
        const { ObjectId } = await import('mongodb');
        const userIdObj = new ObjectId(userId);
        user = await MongoUser.findOne({ _id: userIdObj, isActive: true });
      } else if (drizzleDb && drizzleUsers) {
        const [u] = await drizzleDb.select().from(drizzleUsers).where(drizzleAnd(drizzleEq(drizzleUsers.id, userId), drizzleEq(drizzleUsers.isActive, true))).limit(1);
        user = u;
      } else {
        return res.status(500).json({ message: "No database configured for authentication" });
      }

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Return user without sensitive data
      const id = user.id || user._id;
      const email = user.email;
      const firstName = user.firstName;
      const lastName = user.lastName;
      const role = user.role;
      const name = user.name || `${firstName || ''}${firstName && lastName ? ' ' : ''}${lastName || ''}`.trim();
      const profileImageUrl = user.profileImageUrl || null;
      const mustChangePassword = !!user.forcePasswordChange;

      res.json({ id, email, firstName, lastName, name, profileImageUrl, role, mustChangePassword });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Alias for /api/auth/me (for client compatibility)
  router.get("/api/auth/user", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userId = req.session.userId;
      let user: any = null;

      if (usesMongo && MongoUser) {
        const { ObjectId } = await import('mongodb');
        const userIdObj = new ObjectId(userId);
        user = await MongoUser.findOne({ _id: userIdObj, isActive: true });
      } else if (drizzleDb && drizzleUsers) {
        const [u] = await drizzleDb.select().from(drizzleUsers).where(drizzleAnd(drizzleEq(drizzleUsers.id, userId), drizzleEq(drizzleUsers.isActive, true))).limit(1);
        user = u;
      } else {
        return res.status(500).json({ message: "No database configured for authentication" });
      }

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Return user without sensitive data
      const id = user.id || user._id;
      const email = user.email;
      const firstName = user.firstName;
      const lastName = user.lastName;
      const role = user.role;
      const name = user.name || `${firstName || ''}${firstName && lastName ? ' ' : ''}${lastName || ''}`.trim();
      const profileImageUrl = user.profileImageUrl || null;
      const mustChangePassword = !!user.forcePasswordChange;

      res.json({ id, email, firstName, lastName, name, profileImageUrl, role, mustChangePassword });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  router.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // GET logout endpoint for redirect (compatibility endpoint)
  router.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Error during logout" });
      }
      // Redirect to home page after logout
      res.redirect("/");
    });
  });

  // Change password endpoint
  router.post("/api/auth/change-password", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ message: "New password must be at least 4 characters" });
    }
    try {
      const userId = req.session.userId;
      console.log('Change password for userId:', userId, 'type:', typeof userId);
      let user: any = null;

      if (usesMongo && MongoUser) {
        // Convert userId to ObjectId if needed
        const { ObjectId } = await import('mongodb');
        const userIdObj = new ObjectId(userId);
        user = await MongoUser.findOne({ _id: userIdObj, isActive: true });
        console.log('Found user in MongoDB:', user ? 'yes' : 'no', user ? user.email : '');
      } else if (drizzleDb && drizzleUsers) {
        const [u] = await drizzleDb.select().from(drizzleUsers).where(drizzleAnd(drizzleEq(drizzleUsers.id, userId), drizzleEq(drizzleUsers.isActive, true))).limit(1);
        user = u;
        console.log('Found user in Drizzle:', user ? 'yes' : 'no', user ? user.email : '');
      } else {
        return res.status(500).json({ message: "No database configured" });
      }

      if (!user || !user.password) {
        console.log('User not found or no password set');
        return res.status(404).json({ message: "User not found" });
      }
      
      // If the user has forcePasswordChange set, allow changing password without verifying current password
      const skipCurrentCheck = !!user.forcePasswordChange;
      console.log('User forcePasswordChange:', user.forcePasswordChange, 'skipCurrentCheck:', skipCurrentCheck);

      if (!skipCurrentCheck) {
        // Verify current password
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required" });
        }
        const isValidPassword = await compare(currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }

      // Hash and update new password and clear forcePasswordChange
      const hashedPassword = await hash(newPassword, 10);
      console.log('Updating password for user:', user.email, 'forcePasswordChange to false');

      if (usesMongo && MongoUser) {
        const { ObjectId } = await import('mongodb');
        const userIdObj = new ObjectId(userId);
        const updateResult = await MongoUser.updateOne(
          { _id: userIdObj }, 
          { $set: { password: hashedPassword, forcePasswordChange: false } }
        );
        console.log('MongoDB update result:', {
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
          acknowledged: updateResult.acknowledged
        });
        
        if (updateResult.matchedCount === 0) {
          console.warn('No user matched for update - userId was:', userId);
        }
      } else if (drizzleDb && drizzleUsers) {
        await drizzleDb.update(drizzleUsers).set({ password: hashedPassword, forcePasswordChange: false }).where(drizzleEq(drizzleUsers.id, userId));
        console.log('Drizzle update completed');
      }

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create initial admin user if none exists (Mongo path preferred)
  async function createInitialAdmin() {
    try {
      // DISABLED: Do not reset all user passwords on startup
      // const hashedPassword = await hash("admin", 10);
      
      if (usesMongo && MongoUser) {
        // DISABLED: Do not set default password for all users
        // await MongoUser.updateMany({}, { $set: { password: hashedPassword } });
        // console.log("Set default password 'admin' for all users (mongo)");

        const existingAdmin = await MongoUser.findOne({ role: "admin" });
        if (!existingAdmin) {
          const adminHashedPassword = await hash("admin123", 10);
          await MongoUser.insertOne({
            email: "admin@example.com",
            password: adminHashedPassword,
            firstName: "Admin",
            lastName: "User",
            role: "admin",
            isActive: true
          });
          console.log("Created initial admin user (email: admin@example.com, password: admin123) (mongo)");
        }
      } else if (drizzleDb && drizzleUsers) {
        // DISABLED: Do not set default password for all users
        // await drizzleDb.update(drizzleUsers).set({ password: hashedPassword });
        // console.log("Set default password 'admin' for all users (drizzle)");

        const [existingAdmin] = await drizzleDb.select().from(drizzleUsers).where(drizzleEq(drizzleUsers.role, "admin")).limit(1);
        if (!existingAdmin) {
          const adminHashedPassword = await hash("admin123", 10);
          await drizzleDb.insert(drizzleUsers).values({
            email: "admin@example.com",
            password: adminHashedPassword,
            firstName: "Admin",
            lastName: "User",
            role: "admin",
            isActive: true
          });
          console.log("Created initial admin user (email: admin@example.com, password: admin123) (drizzle)");
        }
      } else {
        console.log("No database available to create initial admin user");
      }
    } catch (error) {
      console.error("Error updating/creating users:", error);
    }
  }

  // Initialize admin setup asynchronously
  createInitialAdmin();

  return router;
}

export { createAuthRouter };