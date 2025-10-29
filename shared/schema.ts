import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, index, jsonb } from "drizzle-orm/pg-core";
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

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const sows = pgTable("sows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sowNumber: text("sow_number").notNull(),
  title: text("title").notNull(),
  initiative: text("initiative").notNull().default(""),
  deliveryPortfolio: text("delivery_portfolio"),
  vendorName: text("vendor_name").notNull(),
  sponsor: text("sponsor"),
  businessOwner: text("business_owner"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  budget: text("budget"),
  currency: text("currency").default("USD"),
  sowType: text("sow_type").notNull(),
  status: text("status").notNull().default("draft"),
  workflowId: varchar("workflow_id").references(() => workflows.id),
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

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  email: text("email").unique(),
  password: text("password"),  // Added password field
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default("user"),
  department: text("department"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sowTypes: text("sow_types").notNull(),
  stages: text("stages").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sowApprovals = pgTable("sow_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sowId: varchar("sow_id").notNull().references(() => sows.id),
  workflowId: varchar("workflow_id").references(() => workflows.id),
  currentStage: integer("current_stage").notNull().default(0),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  status: text("status").notNull().default("pending"),
  comments: text("comments"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSowSchema = createInsertSchema(sows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  sowNumber: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSowApprovalSchema = createInsertSchema(sowApprovals).omit({
  id: true,
  createdAt: true,
});

export type InsertSow = z.infer<typeof insertSowSchema>;
export type Sow = typeof sows.$inferSelect;

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Workflow = typeof workflows.$inferSelect;

export type InsertSowApproval = z.infer<typeof insertSowApprovalSchema>;
export type SowApproval = typeof sowApprovals.$inferSelect;

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

export interface WorkflowStage {
  id: string;
  name: string;
  reviewerIds: string[];
  requireAll: boolean;
}
