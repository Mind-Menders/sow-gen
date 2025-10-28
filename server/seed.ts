import { db } from "./db";
import { templates, users, workflows } from "@shared/schema";

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

const sampleTemplates = [
  {
    name: "Standard RFT Template",
    description: "Comprehensive template for Request for Tender with all standard sections pre-filled",
    sowType: "New Vendor (RFT)",
    isOfficial: "true",
    sections: JSON.stringify(defaultSections),
  },
  {
    name: "Quick Enhancement Template",
    description: "Streamlined template for existing vendor enhancements and change requests",
    sowType: "Existing Vendor Enhancement",
    isOfficial: "true",
    sections: JSON.stringify(defaultSections),
  },
  {
    name: "Flexi Sourcing Template - TNM",
    description: "Template for Time and Materials flexible sourcing arrangements",
    sowType: "Flexi Sourcing - TNM",
    isOfficial: "true",
    sections: JSON.stringify(defaultSections),
  },
];

const sampleUsers = [
  {
    name: "John Smith",
    email: "john.smith@company.com",
    role: "admin",
    department: "IT",
    isActive: true,
  },
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    role: "manager",
    department: "Procurement",
    isActive: true,
  },
  {
    name: "Michael Chen",
    email: "michael.chen@company.com",
    role: "reviewer",
    department: "Legal",
    isActive: true,
  },
  {
    name: "Emily Davis",
    email: "emily.davis@company.com",
    role: "reviewer",
    department: "Finance",
    isActive: true,
  },
];

const sampleWorkflows = [
  {
    name: "Standard Approval",
    description: "Default approval workflow for all SOW types",
    sowTypes: JSON.stringify(["New Vendor (RFT)", "Existing Vendor Enhancement", "Flexi Sourcing - TNM", "Flexi Sourcing - Fixed Scope"]),
    stages: JSON.stringify([
      { id: "stage-1", name: "Legal Review", reviewerIds: [], requireAll: false },
      { id: "stage-2", name: "Finance Approval", reviewerIds: [], requireAll: true },
      { id: "stage-3", name: "Final Sign-off", reviewerIds: [], requireAll: false },
    ]),
    isActive: true,
  },
  {
    name: "Quick Review",
    description: "Expedited workflow for existing vendor enhancements",
    sowTypes: JSON.stringify(["Existing Vendor Enhancement"]),
    stages: JSON.stringify([
      { id: "stage-1", name: "Manager Approval", reviewerIds: [], requireAll: false },
    ]),
    isActive: true,
  },
];

export async function seedDatabase() {
  try {
    console.log("[seed] Checking if data exists...");
    const existingTemplates = await db.select().from(templates);
    const existingUsers = await db.select().from(users);
    const existingWorkflows = await db.select().from(workflows);
    
    if (existingTemplates.length === 0) {
      console.log("[seed] Seeding templates...");
      await db.insert(templates).values(sampleTemplates);
      console.log("[seed] Successfully seeded 3 templates");
    }
    
    if (existingUsers.length === 0) {
      console.log("[seed] Seeding users...");
      await db.insert(users).values(sampleUsers);
      console.log("[seed] Successfully seeded 4 users");
    }
    
    if (existingWorkflows.length === 0) {
      console.log("[seed] Seeding workflows...");
      await db.insert(workflows).values(sampleWorkflows);
      console.log("[seed] Successfully seeded 2 workflows");
    }
    
    if (existingTemplates.length > 0 && existingUsers.length > 0 && existingWorkflows.length > 0) {
      console.log("[seed] Database already seeded, skipping");
    }
  } catch (error) {
    console.error("[seed] Error seeding database:", error);
    throw error;
  }
}
