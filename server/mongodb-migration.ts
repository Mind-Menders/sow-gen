import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sow_gen';

// MongoDB connection
let db: mongoose.Connection;

export const connectToMongo = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    db = mongoose.connection;
    console.log('MongoDB client connected');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Schemas with relaxed validation for migration
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  profileImageUrl: String,
  role: { type: String, default: 'user' },
  department: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const templateSchema = new mongoose.Schema({
  name: String,
  description: String,
  sowType: String,
  isOfficial: String,
  sections: String,
  createdAt: { type: Date, default: Date.now }
});

const workflowSchema = new mongoose.Schema({
  name: String,
  description: String,
  sowTypes: String,
  stages: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Models
export const User = mongoose.model('User', userSchema);
export const Template = mongoose.model('Template', templateSchema);
export const Workflow = mongoose.model('Workflow', workflowSchema);

export const getDb = () => db;