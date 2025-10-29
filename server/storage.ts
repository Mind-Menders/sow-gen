import { type Sow, type InsertSow, type Template, type InsertTemplate, type User, type InsertUser, type UpsertUser, type Workflow, type InsertWorkflow, type SowApproval, type InsertSowApproval } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getAllSows(): Promise<Sow[]>;
  getSowById(id: string): Promise<Sow | undefined>;
  createSow(sow: InsertSow): Promise<Sow>;
  updateSow(id: string, updates: Partial<InsertSow>): Promise<Sow | undefined>;
  deleteSow(id: string): Promise<boolean>;
  
  getAllTemplates(): Promise<Template[]>;
  getTemplateById(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  
  getAllUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | undefined>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  getAllWorkflows(): Promise<Workflow[]>;
  getWorkflowById(id: string): Promise<Workflow | undefined>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined>;
  deleteWorkflow(id: string): Promise<boolean>;
  
  createSowApproval(approval: InsertSowApproval): Promise<SowApproval>;
  getSowApprovalsBySowId(sowId: string): Promise<SowApproval[]>;
}

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

export class MemStorage implements IStorage {
  private sows: Map<string, Sow>;
  private templates: Map<string, Template>;

  constructor() {
    this.sows = new Map();
    this.templates = new Map();
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    const template1: Template = {
      id: randomUUID(),
      name: "Standard RFT Template",
      description: "Comprehensive template for Request for Tender with all standard sections pre-filled",
      sowType: "New Vendor (RFT)",
      isOfficial: "true",
      sections: JSON.stringify(defaultSections),
      createdAt: new Date(),
    };

    const template2: Template = {
      id: randomUUID(),
      name: "Quick Enhancement Template",
      description: "Streamlined template for existing vendor enhancements and change requests",
      sowType: "Existing Vendor Enhancement",
      isOfficial: "true",
      sections: JSON.stringify(defaultSections),
      createdAt: new Date(),
    };

    const template3: Template = {
      id: randomUUID(),
      name: "Flexi Sourcing Template - TNM",
      description: "Template for Time and Materials flexible sourcing arrangements",
      sowType: "Flexi Sourcing - TNM",
      isOfficial: "true",
      sections: JSON.stringify(defaultSections),
      createdAt: new Date(),
    };

    this.templates.set(template1.id, template1);
    this.templates.set(template2.id, template2);
    this.templates.set(template3.id, template3);

    const sampleSections1 = {
      ...defaultSections,
      "executive-summary": {
        ...defaultSections["executive-summary"],
        content: "This SOW outlines the scope of work for Phase 1 of our Digital Transformation Initiative.",
      },
      "scope": {
        ...defaultSections["scope"],
        content: "Implementation of cloud-based infrastructure and migration of legacy systems.",
      },
      "requirements": {
        ...defaultSections["requirements"],
        content: "Must support 10,000+ concurrent users with 99.9% uptime.",
      },
      "deliverables": {
        ...defaultSections["deliverables"],
        content: "Fully functional cloud infrastructure, migrated applications, and documentation.",
      },
      "timeline": {
        ...defaultSections["timeline"],
        content: "10-month project timeline with monthly milestones.",
      },
      "non-functional-requirements": {
        ...defaultSections["non-functional-requirements"],
        content: "Performance, security, scalability, and reliability requirements.",
      },
      "test-acceptance": {
        ...defaultSections["test-acceptance"],
        content: "User acceptance testing phase with defined success criteria.",
      },
      "cybersecurity": {
        ...defaultSections["cybersecurity"],
        content: "Compliance with ISO 27001 and SOC 2 Type II standards.",
      },
      "procurement": {
        ...defaultSections["procurement"],
        content: "Procurement to be finalized by Q1 2024.",
      },
    };

    const sow1: Sow = {
      id: randomUUID(),
      sowNumber: generateSowNumber(),
      title: "Digital Transformation Initiative - Phase 1",
      vendorName: "TechCorp Solutions",
      sponsor: "John Smith",
      sowType: "New Vendor (RFT)",
      status: "pending_approval",
      createdAt: new Date("2025-10-25"),
      updatedAt: new Date("2025-10-25"),
      sections: JSON.stringify(sampleSections1),
    };

    const sow2: Sow = {
      id: randomUUID(),
      sowNumber: generateSowNumber(),
      title: "Mobile App Development - Customer Portal",
      vendorName: "AppBuilders Inc",
      sponsor: "Emily Davis",
      sowType: "Existing Vendor Enhancement",
      status: "approved",
      createdAt: new Date("2025-10-25"),
      updatedAt: new Date("2025-10-25"),
      sections: JSON.stringify(defaultSections),
    };

    const sow3: Sow = {
      id: randomUUID(),
      sowNumber: generateSowNumber(),
      title: "Data Analytics Platform Implementation",
      vendorName: "DataWorks Consulting",
      sponsor: "Robert Williams",
      sowType: "Flexi Sourcing - TNM",
      status: "draft",
      createdAt: new Date("2025-10-25"),
      updatedAt: new Date("2025-10-25"),
      sections: JSON.stringify(defaultSections),
    };

    const sow4: Sow = {
      id: randomUUID(),
      sowNumber: generateSowNumber(),
      title: "Digital Transformation Project",
      vendorName: "Dnata",
      sponsor: "Business",
      sowType: "New Vendor (RFT)",
      status: "draft",
      createdAt: new Date("2025-10-25"),
      updatedAt: new Date("2025-10-25"),
      sections: JSON.stringify(defaultSections),
    };

    const sow5: Sow = {
      id: randomUUID(),
      sowNumber: generateSowNumber(),
      title: "FIS",
      vendorName: "Gtreasury",
      sponsor: "Temi",
      sowType: "New Vendor (RFT)",
      status: "draft",
      createdAt: new Date("2025-10-28"),
      updatedAt: new Date("2025-10-28"),
      sections: JSON.stringify(defaultSections),
    };

    const sow6: Sow = {
      id: randomUUID(),
      sowNumber: generateSowNumber(),
      title: "Digital Trans1",
      vendorName: "eVendor",
      sponsor: "Mohin",
      sowType: "New Vendor (RFT)",
      status: "draft",
      createdAt: new Date("2025-10-28"),
      updatedAt: new Date("2025-10-28"),
      sections: JSON.stringify(defaultSections),
    };

    this.sows.set(sow1.id, sow1);
    this.sows.set(sow2.id, sow2);
    this.sows.set(sow3.id, sow3);
    this.sows.set(sow4.id, sow4);
    this.sows.set(sow5.id, sow5);
    this.sows.set(sow6.id, sow6);
  }

  async getAllSows(): Promise<Sow[]> {
    return Array.from(this.sows.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getSowById(id: string): Promise<Sow | undefined> {
    return this.sows.get(id);
  }

  async createSow(insertSow: InsertSow): Promise<Sow> {
    const id = randomUUID();
    const sowNumber = insertSow.sowNumber || generateSowNumber();
    const now = new Date();
    const sow: Sow = {
      ...insertSow,
      id,
      sowNumber,
      createdAt: now,
      updatedAt: now,
    };
    this.sows.set(id, sow);
    return sow;
  }

  async updateSow(id: string, updates: Partial<InsertSow>): Promise<Sow | undefined> {
    const sow = this.sows.get(id);
    if (!sow) return undefined;

    const updatedSow: Sow = {
      ...sow,
      ...updates,
      updatedAt: new Date(),
    };
    this.sows.set(id, updatedSow);
    return updatedSow;
  }

  async deleteSow(id: string): Promise<boolean> {
    return this.sows.delete(id);
  }

  async getAllTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTemplateById(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const template: Template = {
      ...insertTemplate,
      id,
      createdAt: new Date(),
    };
    this.templates.set(id, template);
    return template;
  }

  // User methods (stub implementations - app uses PostgresStorage)
  async getAllUsers(): Promise<User[]> {
    return [];
  }

  async getUserById(id: string): Promise<User | undefined> {
    return undefined;
  }

  async getUser(id: string): Promise<User | undefined> {
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return undefined;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const now = new Date();
    return {
      id: randomUUID(),
      name: null,
      email: user.email || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      profileImageUrl: user.profileImageUrl || null,
      role: "user",
      department: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  async createUser(user: InsertUser): Promise<User> {
    const now = new Date();
    return {
      id: randomUUID(),
      ...user,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    return undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    return false;
  }

  // Workflow methods (stub implementations)
  async getAllWorkflows(): Promise<Workflow[]> {
    return [];
  }

  async getWorkflowById(id: string): Promise<Workflow | undefined> {
    return undefined;
  }

  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> {
    const now = new Date();
    return {
      id: randomUUID(),
      ...workflow,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined> {
    return undefined;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    return false;
  }

  // Approval methods (stub implementations)
  async createSowApproval(approval: InsertSowApproval): Promise<SowApproval> {
    const now = new Date();
    return {
      id: randomUUID(),
      ...approval,
      createdAt: now,
    };
  }

  async getSowApprovalsBySowId(sowId: string): Promise<SowApproval[]> {
    return [];
  }
}

export const storage = new MemStorage();
