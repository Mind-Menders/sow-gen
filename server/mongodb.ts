import { MongoClient, Db } from 'mongodb';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sow_gen';

// MongoDB connection
let db: Db;

export const connectToMongo = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const client = await MongoClient.connect(MONGODB_URI);
    db = client.db();
    console.log('MongoDB client connected');
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const templateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  sowType: { type: String, required: true },
  isOfficial: { type: String, required: true },
  sections: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const workflowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  sowTypes: { type: String, required: true },
  stages: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Models
export const User = mongoose.model('User', userSchema);
export const Template = mongoose.model('Template', templateSchema);
export const Workflow = mongoose.model('Workflow', workflowSchema);

export const getDb = () => db;