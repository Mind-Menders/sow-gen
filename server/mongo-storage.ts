import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import { hash } from "bcrypt";
import { type Sow, type InsertSow, type Template, type InsertTemplate, type User, type InsertUser, type UpsertUser, type Workflow, type InsertWorkflow, type SowApproval, type InsertSowApproval, type SowAuditTrail, type InsertSowAuditTrail } from "@shared/schema";
import { type IStorage } from "./storage";

function generateSowNumber(): string {
  const random = Math.floor(Math.random() * 90000000) + 10000000;
  return `SOW-${random}`;
}

const defaultSections = {
  "executive-summary": {
    id: "executive-summary",
    icon: "ES",
    title: "Executive Summary",
    content: "",
  },
  "scope": {
    id: "scope",
    icon: "SC",
    title: "Scope",
    content: "",
  },
  "requirements": {
    id: "requirements",
    icon: "RQ",
    title: "Requirements",
    content: "",
  },
  "deliverables": {
    id: "deliverables",
    icon: "DL",
    title: "Deliverables",
    content: "",
  },
  "timeline": {
    id: "timeline",
    icon: "TL",
    title: "Timeline",
    content: "",
  },
  "non-functional-requirements": {
    id: "non-functional-requirements",
    icon: "NF",
    title: "Non-Functional Requirements",
    content: "",
  },
  "test-acceptance": {
    id: "test-acceptance",
    icon: "TA",
    title: "Test & Acceptance",
    content: "",
  },
  "cybersecurity": {
    id: "cybersecurity",
    icon: "CS",
    title: "Cybersecurity",
    content: "",
  },
  "procurement": {
    id: "procurement",
    icon: "PR",
    title: "Procurement",
    content: "",
  },
};

interface MongoSow {
  _id: ObjectId;
  sowNumber: string;
  title: string;
  vendorName: string;
  sponsor?: string | null;
  sowType: string;
  status: string;
  sections: string;
  initiative?: string | null;
  deliveryPortfolio?: string | null;
  businessOwner?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: string | null;
  currency?: string | null;
  workflowId?: string | null;
  requirements?: string | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MongoTemplate {
  _id: ObjectId;
  name: string;
  description: string;
  sowType: string;
  isOfficial: string;
  sections: string;
  createdAt: Date;
}

interface MongoUser {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  role: string;
  department: string;
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MongoWorkflow {
  _id: ObjectId;
  name: string;
  description: string;
  sowTypes: string;
  stages: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MongoSowApproval {
  _id: ObjectId;
  sowId: string;
  workflowId: string | null;
  currentStage: number;
  reviewerId: string | null;
  status: string;
  comments: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

interface MongoSowAuditTrail {
  _id: ObjectId;
  sowId: string;
  action: string;
  performedBy: string;
  previousStatus: string | null;
  newStatus: string | null;
  previousReviewer: string | null;
  newReviewer: string | null;
  remarks: string | null;
  metadata: string | null;
  createdAt: Date;
}

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private db: Db | null = null;
  private sowsCollection: Collection<MongoSow> | null = null;
  private templatesCollection: Collection<MongoTemplate> | null = null;
  private usersCollection: Collection<MongoUser> | null = null;
  private workflowsCollection: Collection<MongoWorkflow> | null = null;
  private approvalsCollection: Collection<MongoSowApproval> | null = null;
  private auditTrailCollection: Collection<MongoSowAuditTrail> | null = null;
  private connected: boolean = false;

  constructor(uri: string) {
    this.client = new MongoClient(uri);
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected && this.db) return;

    await this.client.connect();
    this.db = this.client.db("sow_generator");
    this.sowsCollection = this.db.collection<MongoSow>("sows");
    this.templatesCollection = this.db.collection<MongoTemplate>("templates");
    this.usersCollection = this.db.collection<MongoUser>("users");
    this.workflowsCollection = this.db.collection<MongoWorkflow>("workflows");
    this.approvalsCollection = this.db.collection<MongoSowApproval>("sow_approvals");
    this.auditTrailCollection = this.db.collection<MongoSowAuditTrail>("sow_audit_trail");
    this.connected = true;

    await this.initializeDefaultData();
  }


  private async initializeDefaultData(): Promise<void> {
    if (!this.templatesCollection || !this.sowsCollection || !this.usersCollection || !this.workflowsCollection) return;

    const templateCount = await this.templatesCollection.countDocuments();
    if (templateCount === 0) {
      const templates = [
      {
        _id: new ObjectId(),
        name: "Standard RFT Template",
        description: "Comprehensive template for Request for Tender with all standard sections pre-filled",
        sowType: "New Vendor (RFT)",
        isOfficial: "true",
        sections: JSON.stringify(defaultSections),
        createdAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: "Quick Enhancement Template",
        description: "Streamlined template for existing vendor enhancements and change requests",
        sowType: "Existing Vendor Enhancement",
        isOfficial: "true",
        sections: JSON.stringify(defaultSections),
        createdAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: "Flexi Sourcing Template - TNM",
        description: "Template for Time and Materials flexible sourcing arrangements",
        sowType: "Flexi Sourcing - TNM",
        isOfficial: "true",
        sections: JSON.stringify(defaultSections),
        createdAt: new Date(),
      },
    ];

      await this.templatesCollection.insertMany(templates);
    const sampleSections1 = {
      ...defaultSections,
      "executive-summary": {
        ...defaultSections["executive-summary"],
        content: "Digital transformation initiative to modernize legacy systems.",
      },
      "scope": {
        ...defaultSections["scope"],
        content: "Implementation of cloud-based infrastructure and migration of existing applications.",
      },
    };

    const sows = [
      {
        _id: new ObjectId(),
        sowNumber: generateSowNumber(),
        title: "Digital Transformation Initiative - Phase 1",
        vendorName: "TechCorp Solutions",
        sponsor: "John Smith",
        sowType: "New Vendor (RFT)",
        status: "pending_approval",
        createdAt: new Date("2025-10-25"),
        updatedAt: new Date("2025-10-25"),
        sections: JSON.stringify(sampleSections1),
      },
      {
        _id: new ObjectId(),
        sowNumber: generateSowNumber(),
        title: "Mobile App Development - Customer Portal",
        vendorName: "AppBuilders Inc",
        sponsor: "Emily Davis",
        sowType: "Existing Vendor Enhancement",
        status: "approved",
        createdAt: new Date("2025-10-25"),
        updatedAt: new Date("2025-10-25"),
        sections: JSON.stringify(defaultSections),
      },
      {
        _id: new ObjectId(),
        sowNumber: generateSowNumber(),
        title: "Data Analytics Platform Implementation",
        vendorName: "DataWorks Consulting",
        sponsor: "Robert Williams",
        sowType: "Flexi Sourcing - TNM",
        status: "draft",
        createdAt: new Date("2025-10-25"),
        updatedAt: new Date("2025-10-25"),
        sections: JSON.stringify(defaultSections),
      },
    ];

      await this.sowsCollection.insertMany(sows);
    }

    // Seed users if empty
    const userCount = await this.usersCollection.countDocuments();
    if (userCount === 0) {
      const users = [
        {
          _id: new ObjectId(),
          name: "Sarah Johnson",
          email: "sarah.johnson@company.com",
          password: "",
          firstName: "Sarah",
          lastName: "Johnson",
          role: "manager",
          profileImageUrl: "",
          department: "",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: "Michael Chen",
          email: "michael.chen@company.com",
          password: "",
          firstName: "Michael",
          lastName: "Chen",
          role: "reviewer",
          profileImageUrl: "",
          department: "",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: "Emily Davis",
          email: "emily.davis@company.com",
          password: "",
          firstName: "Emily",
          lastName: "Davis",
          role: "reviewer",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: "John Smith",
          email: "john.smith@company.com",
          password: "",
          firstName: "John",
          lastName: "Smith",
          role: "admin",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await this.usersCollection.insertMany(users as any);
    }

    // Seed workflows if empty
    const workflowCount = await this.workflowsCollection.countDocuments();
    if (workflowCount === 0) {
      const workflows = [
        {
          _id: new ObjectId(),
          name: "Standard Approval",
          description: "Standard multi-stage approval workflow",
          sowTypes: "New Vendor (RFT)",
          stages: JSON.stringify([]),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: "Quick Review",
          description: "Two-stage quick review workflow",
          sowTypes: "Existing Vendor Enhancement",
          stages: JSON.stringify([]),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await this.workflowsCollection.insertMany(workflows);
    }
  }

  private mongoSowToSow(mongoSow: MongoSow): Sow {
    return {
      id: mongoSow._id.toHexString(),
      sowNumber: mongoSow.sowNumber,
      title: mongoSow.title,
      vendorName: mongoSow.vendorName,
      sponsor: mongoSow.sponsor ?? null,
      sowType: mongoSow.sowType,
      status: mongoSow.status,
      sections: mongoSow.sections,
      initiative: mongoSow.initiative ?? "",
      deliveryPortfolio: mongoSow.deliveryPortfolio ?? null,
      businessOwner: mongoSow.businessOwner ?? null,
      startDate: mongoSow.startDate ?? null,
      endDate: mongoSow.endDate ?? null,
      budget: mongoSow.budget ?? null,
      currency: mongoSow.currency ?? null,
      workflowId: mongoSow.workflowId ?? null,
      requirements: mongoSow.requirements ?? null,
      createdBy: mongoSow.createdBy ?? null,
      createdAt: mongoSow.createdAt,
      updatedAt: mongoSow.updatedAt,
    };
  }

  private mongoTemplateToTemplate(mongoTemplate: MongoTemplate): Template {
    return {
      id: mongoTemplate._id.toHexString(),
      name: mongoTemplate.name,
      description: mongoTemplate.description,
      sowType: mongoTemplate.sowType,
      isOfficial: mongoTemplate.isOfficial,
      sections: mongoTemplate.sections,
      createdAt: mongoTemplate.createdAt,
    };
  }

  async getAllSows(): Promise<Sow[]> {
    await this.ensureConnected();
    const mongoSows = await this.sowsCollection!.find().sort({ createdAt: -1 }).toArray();
    return mongoSows.map((s) => this.mongoSowToSow(s));
  }

  async getSowById(id: string): Promise<Sow | undefined> {
    await this.ensureConnected();
    const mongoSow = await this.sowsCollection!.findOne({ _id: new ObjectId(id) });
    return mongoSow ? this.mongoSowToSow(mongoSow) : undefined;
  }

  async createSow(insertSow: InsertSow): Promise<Sow> {
    await this.ensureConnected();
    const now = new Date();
    const mongoSow: MongoSow = {
      _id: new ObjectId(),
      sowNumber: insertSow.sowNumber || generateSowNumber(),
      title: insertSow.title,
      initiative: insertSow.initiative,
      deliveryPortfolio: insertSow.deliveryPortfolio,
      vendorName: insertSow.vendorName,
      sponsor: insertSow.sponsor,
      businessOwner: insertSow.businessOwner,
      startDate: insertSow.startDate,
      endDate: insertSow.endDate,
      budget: insertSow.budget,
      currency: insertSow.currency,
      sowType: insertSow.sowType,
      status: insertSow.status || "draft",
      workflowId: insertSow.workflowId,
      requirements: insertSow.requirements,
      createdBy: insertSow.createdBy,
      sections: insertSow.sections || "{}",
      createdAt: now,
      updatedAt: now,
    };
    await this.sowsCollection!.insertOne(mongoSow);
    return this.mongoSowToSow(mongoSow);
  }

  async updateSow(id: string, updates: Partial<InsertSow>): Promise<Sow | undefined> {
    await this.ensureConnected();
    const result = await this.sowsCollection!.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return result ? this.mongoSowToSow(result) : undefined;
  }

  async deleteSow(id: string): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.sowsCollection!.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async getAllTemplates(): Promise<Template[]> {
    await this.ensureConnected();
    const mongoTemplates = await this.templatesCollection!.find().sort({ createdAt: -1 }).toArray();
    return mongoTemplates.map((t) => this.mongoTemplateToTemplate(t));
  }

  async getTemplateById(id: string): Promise<Template | undefined> {
    await this.ensureConnected();
    const mongoTemplate = await this.templatesCollection!.findOne({ _id: new ObjectId(id) });
    return mongoTemplate ? this.mongoTemplateToTemplate(mongoTemplate) : undefined;
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    await this.ensureConnected();
    const mongoTemplate: MongoTemplate = {
      _id: new ObjectId(),
      name: insertTemplate.name,
      description: insertTemplate.description,
      sowType: insertTemplate.sowType,
      isOfficial: insertTemplate.isOfficial || "false",
      sections: insertTemplate.sections || "{}",
      createdAt: new Date(),
    };
    await this.templatesCollection!.insertOne(mongoTemplate);
    return this.mongoTemplateToTemplate(mongoTemplate);
  }

  private mongoUserToUser(mongoUser: MongoUser): User {
    return {
      id: mongoUser._id.toHexString(),
      name: mongoUser.name || "",
      email: mongoUser.email || "",
      password: mongoUser.password || "",
      firstName: mongoUser.firstName || "",
      lastName: mongoUser.lastName || "",
      profileImageUrl: mongoUser.profileImageUrl || "",
      role: mongoUser.role || "user",
      department: mongoUser.department || "",
      isActive: mongoUser.isActive ?? true,
      forcePasswordChange: mongoUser.forcePasswordChange ?? true,
      createdAt: mongoUser.createdAt,
      updatedAt: mongoUser.updatedAt,
    };
  }

  private mongoWorkflowToWorkflow(mongoWorkflow: MongoWorkflow): Workflow {
    return {
      id: mongoWorkflow._id.toHexString(),
      name: mongoWorkflow.name,
      description: mongoWorkflow.description,
      sowTypes: mongoWorkflow.sowTypes,
      stages: mongoWorkflow.stages,
      isActive: mongoWorkflow.isActive,
      createdAt: mongoWorkflow.createdAt,
      updatedAt: mongoWorkflow.updatedAt,
    };
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureConnected();
    const mongoUsers = await this.usersCollection!.find().sort({ createdAt: -1 }).toArray();
    return mongoUsers.map((u) => this.mongoUserToUser(u));
  }

  async getUserById(id: string): Promise<User | undefined> {
    await this.ensureConnected();
    const mongoUser = await this.usersCollection!.findOne({ _id: new ObjectId(id) });
    return mongoUser ? this.mongoUserToUser(mongoUser) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureConnected();
    const mongoUser = await this.usersCollection!.findOne({ email });
    return mongoUser ? this.mongoUserToUser(mongoUser) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureConnected();
    const now = new Date();
    // If no password provided, set default password to 'admin' (hashed)
    const rawPassword = insertUser.password && insertUser.password.length > 0 ? insertUser.password : "admin";
    const hashed = await hash(rawPassword, 10);

    const mongoUser: MongoUser = {
      _id: new ObjectId(),
      name: insertUser.name || "",
      email: insertUser.email || "",
      password: hashed,
      firstName: insertUser.firstName || "",
      lastName: insertUser.lastName || "",
      profileImageUrl: insertUser.profileImageUrl || "",
      role: insertUser.role || 'user',
      department: insertUser.department || "",
      isActive: insertUser.isActive ?? true,
      forcePasswordChange: insertUser.forcePasswordChange ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await this.usersCollection!.insertOne(mongoUser);
    return this.mongoUserToUser(mongoUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    await this.ensureConnected();
    return this.getUserById(id);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    await this.ensureConnected();
    const now = new Date();
    const _id = user.id ? new ObjectId(user.id) : new ObjectId();
    const passwordToUse = user.password && user.password.length > 0 ? await hash(user.password, 10) : await hash("admin", 10);
    const mongoUser: MongoUser = {
      _id,
      name: user.name || "",
      email: user.email || "",
      password: passwordToUse,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      profileImageUrl: user.profileImageUrl || "",
      role: user.role || "user",
      department: user.department || "",
      isActive: user.isActive ?? true,
      forcePasswordChange: (user as any).forcePasswordChange ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await this.usersCollection!.updateOne({ _id }, { $set: mongoUser }, { upsert: true });
    return this.mongoUserToUser(mongoUser);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    await this.ensureConnected();
    const result = await this.usersCollection!.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...(updates as any), updatedAt: new Date() } as any },
      { returnDocument: "after" }
    );
    return result ? this.mongoUserToUser(result) : undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.usersCollection!.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async getAllWorkflows(): Promise<Workflow[]> {
    await this.ensureConnected();
    const mongoWorkflows = await this.workflowsCollection!.find().sort({ createdAt: -1 }).toArray();
    return mongoWorkflows.map((w) => this.mongoWorkflowToWorkflow(w));
  }

  async getWorkflowById(id: string): Promise<Workflow | undefined> {
    await this.ensureConnected();
    const mongoWorkflow = await this.workflowsCollection!.findOne({ _id: new ObjectId(id) });
    return mongoWorkflow ? this.mongoWorkflowToWorkflow(mongoWorkflow) : undefined;
  }

  async createWorkflow(insertWorkflow: InsertWorkflow): Promise<Workflow> {
    await this.ensureConnected();
    const now = new Date();
    const mongoWorkflow: MongoWorkflow = {
      _id: new ObjectId(),
      name: insertWorkflow.name,
      description: insertWorkflow.description,
      sowTypes: insertWorkflow.sowTypes,
      stages: insertWorkflow.stages || '[]',
      isActive: insertWorkflow.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await this.workflowsCollection!.insertOne(mongoWorkflow);
    return this.mongoWorkflowToWorkflow(mongoWorkflow);
  }

  async updateWorkflow(id: string, updates: Partial<InsertWorkflow>): Promise<Workflow | undefined> {
    await this.ensureConnected();
    const result = await this.workflowsCollection!.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return result ? this.mongoWorkflowToWorkflow(result) : undefined;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.workflowsCollection!.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // Approval methods
  async createSowApproval(approval: InsertSowApproval): Promise<SowApproval> {
    await this.ensureConnected();
    const now = new Date();
    const mongoApproval = {
      _id: new ObjectId(),
      sowId: approval.sowId,
      workflowId: approval.workflowId || null,
      currentStage: approval.currentStage,
      reviewerId: approval.reviewerId || null,
      status: approval.status,
      comments: approval.comments || null,
      reviewedAt: approval.reviewedAt || null,
      createdAt: now,
    } as any;
    await this.approvalsCollection!.insertOne(mongoApproval);
    return {
      id: mongoApproval._id.toHexString(),
      sowId: mongoApproval.sowId,
      workflowId: mongoApproval.workflowId,
      currentStage: mongoApproval.currentStage,
      reviewerId: mongoApproval.reviewerId,
      status: mongoApproval.status,
      comments: mongoApproval.comments,
      reviewedAt: mongoApproval.reviewedAt,
      createdAt: mongoApproval.createdAt,
    } as SowApproval;
  }

  async getSowApprovalsBySowId(sowId: string): Promise<SowApproval[]> {
    await this.ensureConnected();
    const mongoApprovals = await this.approvalsCollection!.find({ sowId }).sort({ createdAt: -1 }).toArray();
    return mongoApprovals.map((a: any) => ({
      id: a._id.toHexString(),
      sowId: a.sowId,
      workflowId: a.workflowId,
      currentStage: a.currentStage,
      reviewerId: a.reviewerId,
      status: a.status,
      comments: a.comments,
      reviewedAt: a.reviewedAt,
      createdAt: a.createdAt,
    }));
  }

  async updateSowApproval(id: string, updates: Partial<SowApproval>): Promise<SowApproval | null> {
    await this.ensureConnected();
    const result = await this.approvalsCollection!.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result) return null;
    return {
      id: result._id.toHexString(),
      sowId: result.sowId,
      workflowId: result.workflowId,
      currentStage: result.currentStage,
      reviewerId: result.reviewerId,
      status: result.status,
      comments: result.comments,
      reviewedAt: result.reviewedAt,
      createdAt: result.createdAt,
    };
  }

  async getSowApprovals(sowId: string): Promise<SowApproval[]> {
    return await this.getSowApprovalsBySowId(sowId);
  }

  // Audit Trail methods
  async createSowAuditEntry(entry: InsertSowAuditTrail): Promise<SowAuditTrail> {
    await this.ensureConnected();
    const mongoEntry = {
      _id: new ObjectId(),
      sowId: entry.sowId,
      action: entry.action,
      performedBy: entry.performedBy,
      previousStatus: entry.previousStatus || null,
      newStatus: entry.newStatus || null,
      previousReviewer: entry.previousReviewer || null,
      newReviewer: entry.newReviewer || null,
      remarks: entry.remarks || null,
      metadata: entry.metadata || null,
      createdAt: new Date(),
    };
    await this.auditTrailCollection!.insertOne(mongoEntry);
    return {
      id: mongoEntry._id.toHexString(),
      sowId: mongoEntry.sowId,
      action: mongoEntry.action,
      performedBy: mongoEntry.performedBy,
      previousStatus: mongoEntry.previousStatus,
      newStatus: mongoEntry.newStatus,
      previousReviewer: mongoEntry.previousReviewer,
      newReviewer: mongoEntry.newReviewer,
      remarks: mongoEntry.remarks,
      metadata: mongoEntry.metadata,
      createdAt: mongoEntry.createdAt,
    } as SowAuditTrail;
  }

  async getSowAuditTrail(sowId: string): Promise<SowAuditTrail[]> {
    await this.ensureConnected();
    const mongoEntries = await this.auditTrailCollection!.find({ sowId }).sort({ createdAt: -1 }).toArray();
    return mongoEntries.map((entry: any) => ({
      id: entry._id.toHexString(),
      sowId: entry.sowId,
      action: entry.action,
      performedBy: entry.performedBy,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      previousReviewer: entry.previousReviewer,
      newReviewer: entry.newReviewer,
      remarks: entry.remarks,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
    }));
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }
}
