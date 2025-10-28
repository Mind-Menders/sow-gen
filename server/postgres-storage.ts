import { eq } from "drizzle-orm";
import { db } from "./db";
import { sows, templates, users, workflows, sowApprovals, type Sow, type Template, type User, type UpsertUser, type Workflow, type SowApproval, type InsertSow, type InsertTemplate, type InsertUser, type InsertWorkflow, type InsertSowApproval } from "@shared/schema";
import type { IStorage } from "./storage";

export class PostgresStorage implements IStorage {
  // SOW methods
  async getAllSows(): Promise<Sow[]> {
    return await db.select().from(sows);
  }

  async getSowById(id: string): Promise<Sow | undefined> {
    const result = await db.select().from(sows).where(eq(sows.id, id)).limit(1);
    return result[0];
  }

  async createSow(sow: InsertSow): Promise<Sow> {
    // Generate SOW number if not provided
    const sowNumber = sow.sowNumber || `SOW-${Date.now().toString().slice(-8)}`;
    
    const result = await db.insert(sows).values({
      ...sow,
      sowNumber,
    }).returning();
    
    return result[0];
  }

  async updateSow(id: string, updates: Partial<Sow>): Promise<Sow | undefined> {
    const result = await db.update(sows)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(sows.id, id))
      .returning();
    
    return result[0];
  }

  async deleteSow(id: string): Promise<boolean> {
    const result = await db.delete(sows).where(eq(sows.id, id)).returning();
    return result.length > 0;
  }

  // Template methods
  async getAllTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async getTemplateById(id: string): Promise<Template | undefined> {
    const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
    return result[0];
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const result = await db.insert(templates).values(template).returning();
    return result[0];
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
    const result = await db.update(templates)
      .set(updates)
      .where(eq(templates.id, id))
      .returning();
    
    return result[0];
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await db.delete(templates).where(eq(templates.id, id)).returning();
    return result.length > 0;
  }

  // User methods
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  // Workflow methods
  async getAllWorkflows(): Promise<Workflow[]> {
    return await db.select().from(workflows);
  }

  async getWorkflowById(id: string): Promise<Workflow | undefined> {
    const result = await db.select().from(workflows).where(eq(workflows.id, id)).limit(1);
    return result[0];
  }

  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> {
    const result = await db.insert(workflows).values(workflow).returning();
    return result[0];
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined> {
    const result = await db.update(workflows)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, id))
      .returning();
    
    return result[0];
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const result = await db.delete(workflows).where(eq(workflows.id, id)).returning();
    return result.length > 0;
  }

  // SOW Approval methods
  async createSowApproval(approval: InsertSowApproval): Promise<SowApproval> {
    const result = await db.insert(sowApprovals).values(approval).returning();
    return result[0];
  }

  async getSowApprovalsBySowId(sowId: string): Promise<SowApproval[]> {
    return await db.select().from(sowApprovals).where(eq(sowApprovals.sowId, sowId));
  }
}
