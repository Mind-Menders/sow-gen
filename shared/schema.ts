import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sowTypes = [
  "New Vendor (RFT)",
  "Existing Vendor Enhancement",
  "Flexi Sourcing - TNM",
  "Flexi Sourcing - Fixed Scope"
] as const;

export const sowStatuses = [
  "draft",
  "pending_approval",
  "approved",
  "rejected"
] as const;

export const sows = pgTable("sows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sowNumber: text("sow_number").notNull(),
  title: text("title").notNull(),
  vendorName: text("vendor_name").notNull(),
  sponsor: text("sponsor").notNull(),
  sowType: text("sow_type").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  sections: text("sections").notNull().default("{}"),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sowType: text("sow_type").notNull(),
  isOfficial: text("is_official").notNull().default("true"),
  sections: text("sections").notNull().default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSowSchema = createInsertSchema(sows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export type InsertSow = z.infer<typeof insertSowSchema>;
export type Sow = typeof sows.$inferSelect;

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

export type SowType = typeof sowTypes[number];
export type SowStatus = typeof sowStatuses[number];

export interface SowSection {
  id: string;
  icon: string;
  title: string;
  content: string;
}

export interface SowSections {
  [key: string]: SowSection;
}
