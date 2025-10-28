import { db } from "./db";
import { templates } from "@shared/schema";

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

export async function seedDatabase() {
  try {
    console.log("[seed] Checking if templates exist...");
    const existing = await db.select().from(templates);
    
    if (existing.length === 0) {
      console.log("[seed] Seeding database with sample templates...");
      await db.insert(templates).values(sampleTemplates);
      console.log("[seed] Successfully seeded 3 templates");
    } else {
      console.log("[seed] Templates already exist, skipping seed");
    }
  } catch (error) {
    console.error("[seed] Error seeding database:", error);
    throw error;
  }
}
