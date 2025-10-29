import { Router } from "express";
import { compare, hash } from "bcrypt";

// Prefer MongoDB-backed auth when configured
let usesMongo = false;
let MongoUser: any = null;
try {
  if (process.env.MONGODB_URI) {
    usesMongo = true;
  const mongo = await import("./archive-migrations/mongodb-migration");
    await mongo.connectToMongo();
    MongoUser = mongo.User;
    console.log("Auth: using MongoDB for user storage");
  }
} catch (err) {
  console.warn("Auth: failed to initialize MongoDB, falling back to Postgres if available", err);
}

// If Mongo not available, keep using drizzle-based queries
let drizzleDb: any = null;
let drizzleUsers: any = null;
let drizzleAnd: any = null;
let drizzleEq: any = null;
try {
  if (!usesMongo) {
    const d = await import("./db");
    const schema = await import("@shared/schema");
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
      user = await MongoUser.findOne({ email: email, isActive: true }).lean();
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
    if (!user.password) {
      console.log('User has no password set');
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log('Verifying password...');
    const isValidPassword = await compare(password, user.password);

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
    res.json({ id, email: userEmail, firstName, lastName, role });
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
      user = await MongoUser.findOne({ _id: userId, isActive: true }).lean();
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
    res.json({ id, email, firstName, lastName, role });
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

// Create initial admin user if none exists (Mongo path preferred)
async function createInitialAdmin() {
  try {
    if (usesMongo && MongoUser) {
      // Hash and update existing user
      const hashedPassword = await hash("admin", 10);
      await MongoUser.updateOne({ email: "john.smith@company.com" }, { $set: { password: hashedPassword } });
      console.log("Updated john.smith@company.com password hash (mongo)");

      const existingAdmin = await MongoUser.findOne({ role: "admin" }).lean();
      if (!existingAdmin) {
        const adminHashedPassword = await hash("admin123", 10);
        await MongoUser.create({
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
      const hashedPassword = await hash("admin", 10);
      await drizzleDb.update(drizzleUsers).set({ password: hashedPassword }).where(drizzleEq(drizzleUsers.email, "john.smith@company.com"));
      console.log("Updated john.smith@company.com password hash (drizzle)");

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

export { router as authRouter };