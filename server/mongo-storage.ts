import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import { type Sow, type InsertSow, type Template, type InsertTemplate } from "@shared/schema";
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
  sponsor: string;
  sowType: string;
  status: string;
  sections: string;
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

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private db: Db | null = null;
  private sowsCollection: Collection<MongoSow> | null = null;
  private templatesCollection: Collection<MongoTemplate> | null = null;
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
    this.connected = true;

    await this.initializeDefaultData();
  }

  private async initializeDefaultData(): Promise<void> {
    if (!this.templatesCollection || !this.sowsCollection) return;

    const templateCount = await this.templatesCollection.countDocuments();
    if (templateCount > 0) return;

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

  private mongoSowToSow(mongoSow: MongoSow): Sow {
    return {
      id: mongoSow._id.toHexString(),
      sowNumber: mongoSow.sowNumber,
      title: mongoSow.title,
      vendorName: mongoSow.vendorName,
      sponsor: mongoSow.sponsor,
      sowType: mongoSow.sowType,
      status: mongoSow.status,
      sections: mongoSow.sections,
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
      vendorName: insertSow.vendorName,
      sponsor: insertSow.sponsor,
      sowType: insertSow.sowType,
      status: insertSow.status || "draft",
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

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }
}
