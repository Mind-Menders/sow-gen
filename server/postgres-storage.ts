import { eq } from "drizzle-orm";
import { db } from "./db";
import { sows, templates, type Sow, type Template, type InsertSow, type InsertTemplate } from "@shared/schema";
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
}
