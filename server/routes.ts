import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, type IStorage } from "./storage";
import { insertSowSchema, insertTemplateSchema, insertUserSchema, insertWorkflowSchema } from "@shared/schema";
import { generateContentSuggestion, analyzeSectionQuality, getInlineSuggestion, chatWithAI, suggestSections } from "./openai";
import { generatePDF, generateWord } from "./export";
import { createAuthRouter } from "./auth";

let dbStorage: IStorage = storage;

// Initialize PostgreSQL storage if DATABASE_URL is available
async function initializeStorage() {
  // Prefer MongoDB if configured
  if (process.env.MONGODB_URI) {
    try {
      const { MongoStorage } = await import("./mongo-storage");
      const mongoStorage = new MongoStorage(process.env.MONGODB_URI);
      // Test connection by fetching templates (this will also initialize defaults)
      await mongoStorage.getAllTemplates();
  dbStorage = mongoStorage as unknown as IStorage;
      console.log("[storage] Using MongoDB storage");
      return;
    } catch (error) {
      console.warn("[storage] MongoDB connection failed, falling back to other storage:", error instanceof Error ? error.message : String(error));
    }
  }

  // If no MongoDB or it failed, try PostgreSQL
  if (process.env.DATABASE_URL) {
    try {
  const { PostgresStorage } = await import("./postgres-storage");
  const { seedDatabase } = await import("./archive-migrations/seed");

      const postgresStorage = new PostgresStorage();
      // Test connection
      await postgresStorage.getAllTemplates();
      dbStorage = postgresStorage;
      console.log("[storage] Using PostgreSQL storage");
      
      // Seed database with sample data
      await seedDatabase();
      return;
    } catch (error) {
      console.warn("[storage] PostgreSQL connection failed, using in-memory storage:", error instanceof Error ? error.message : String(error));
      dbStorage = storage;
      return;
    }
  }

  console.log("[storage] Using in-memory storage (no DATABASE_URL or MONGODB_URI configured)");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize storage before registering routes
  await initializeStorage();
  
  // Initialize auth router after storage
  const authRouter = await createAuthRouter();
  
  // Use our authentication routes
  app.use(authRouter);
  
  app.get("/api/sows", async (req, res) => {
    try {
      const sows = await dbStorage.getAllSows();
      res.json(sows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SOWs" });
    }
  });

  app.get("/api/sows/:id", async (req, res) => {
    console.log(`[GET /api/sows/:id] Endpoint hit. Session userId: ${req.session.userId}, SOW ID: ${req.params.id}`);
    try {
      const sow = await dbStorage.getSowById(req.params.id);
      console.log(`[GET /api/sows/:id] SOW lookup result: ${sow ? "found" : "not found"}`);
      if (!sow) {
        return res.status(404).json({ error: "SOW not found" });
      }

      // Allow any authenticated user to view SOWs
      // Authorization is not enforced at the read level
      console.log(`[GET /api/sows/:id] Returning SOW data`);
      res.json(sow);
    } catch (error) {
      console.log(`[GET /api/sows/:id] Error: ${error}`);
      res.status(500).json({ error: "Failed to fetch SOW" });
    }
  });

  app.post("/api/sows", async (req, res) => {
    try {
      const validated = insertSowSchema.parse(req.body);
      let sow = await dbStorage.createSow(validated);

      // If a workflow is assigned, ensure SOW status is pending_review and create approval records for all reviewers in all stages
      if (sow.workflowId) {
        try {
          if (sow.status !== 'pending_review') {
            await dbStorage.updateSow(sow.id, { status: 'pending_review' });
            sow = await dbStorage.getSowById(sow.id) as any;
          }
        } catch (e) {
          console.warn('Failed to set sow status to pending_review', e);
        }
        try {
          const workflow = sow.workflowId ? await dbStorage.getWorkflowById(sow.workflowId) : null;
          if (workflow && workflow.stages) {
            let stages;
            try {
              stages = typeof workflow.stages === "string" ? JSON.parse(workflow.stages) : workflow.stages;
            } catch (e) {
              stages = [];
            }
            if (Array.isArray(stages)) {
              for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
                const stage = stages[stageIdx];
                if (stage.reviewerIds && Array.isArray(stage.reviewerIds)) {
                  for (const reviewerId of stage.reviewerIds) {
                    await dbStorage.createSowApproval({
                      sowId: sow.id,
                      workflowId: sow.workflowId,
                      currentStage: stageIdx,
                      reviewerId,
                      status: "pending",
                    });
                  }
                }
              }
            }
          }
        } catch (approvalErr) {
          // Log and continue — approval creation failing should not block SOW creation
          console.warn("Failed to create sow approvals:", approvalErr instanceof Error ? approvalErr.message : String(approvalErr));
        }
      }

      res.status(201).json(sow);
    } catch (error) {
      if (error instanceof Error) {
        // Try to show validation errors (Zod) if present
        let message = error.message || "Invalid SOW data";
        if ((error as any).name === "ZodError") {
          try {
            const zodError = JSON.parse(error.message);
            message = zodError.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
          } catch {
            // leave message as-is
          }
        }
        res.status(400).json({ error: message });
      } else {
        res.status(400).json({ error: "Invalid SOW data" });
      }
    }
  });

  app.patch("/api/sows/:id", async (req, res) => {
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Get the SOW to check existence
      const existingSow = await dbStorage.getSowById(req.params.id);
      if (!existingSow) {
        return res.status(404).json({ error: "SOW not found" });
      }

      // Allow any authenticated user to edit
      const sow = await dbStorage.updateSow(req.params.id, req.body);
      if (!sow) {
        return res.status(404).json({ error: "SOW not found" });
      }

      // If workflowId changed or status is pending_approval, sync approval records for all reviewers in all stages
      if (sow.workflowId) {
        try {
          const workflow = await dbStorage.getWorkflowById(sow.workflowId);
          if (workflow && workflow.stages) {
            let stages;
            try {
              stages = typeof workflow.stages === "string" ? JSON.parse(workflow.stages) : workflow.stages;
            } catch (e) {
              stages = [];
            }
            if (Array.isArray(stages)) {
              const existingApprovals = await dbStorage.getSowApprovalsBySowId(sow.id);
              const approvalKeys = new Set(existingApprovals.map(a => `${a.currentStage}:${a.reviewerId}`));
              for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
                const stage = stages[stageIdx];
                if (stage.reviewerIds && Array.isArray(stage.reviewerIds)) {
                  for (const reviewerId of stage.reviewerIds) {
                    const key = `${stageIdx}:${reviewerId}`;
                    if (!approvalKeys.has(key)) {
                      await dbStorage.createSowApproval({
                        sowId: sow.id,
                        workflowId: sow.workflowId,
                        currentStage: stageIdx,
                        reviewerId,
                        status: "pending",
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (approvalErr) {
          console.warn("Failed to sync sow approvals:", approvalErr instanceof Error ? approvalErr.message : String(approvalErr));
        }
      }

      res.json(sow);
    } catch (error) {
      res.status(400).json({ error: "Failed to update SOW" });
    }
  });

  app.delete("/api/sows/:id", async (req, res) => {
    try {
      const success = await dbStorage.deleteSow(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "SOW not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete SOW" });
    }
  });

  // Copy SOW endpoint
  app.post("/api/sows/:id/copy", async (req, res) => {
    try {
      const originalSow = await dbStorage.getSowById(req.params.id);
      if (!originalSow) {
        return res.status(404).json({ error: "SOW not found" });
      }

      // Create a copy with a new SOW number and draft status
      const copiedSow = await dbStorage.createSow({
        title: `${originalSow.title} (Copy)`,
        initiative: originalSow.initiative,
        deliveryPortfolio: originalSow.deliveryPortfolio,
        vendorName: originalSow.vendorName,
        sponsor: originalSow.sponsor,
        businessOwner: originalSow.businessOwner,
        startDate: originalSow.startDate,
        endDate: originalSow.endDate,
        budget: originalSow.budget,
        currency: originalSow.currency,
        sowType: originalSow.sowType,
        status: "draft",
        workflowId: originalSow.workflowId,
        requirements: originalSow.requirements,
        createdBy: req.body.createdBy || originalSow.createdBy,
        sections: originalSow.sections,
      });

      res.status(201).json(copiedSow);
    } catch (error) {
      res.status(500).json({ error: "Failed to copy SOW" });
    }
  });

  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await dbStorage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await dbStorage.getTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const validated = insertTemplateSchema.parse(req.body);
      const template = await dbStorage.createTemplate(validated);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ error: "Invalid template data" });
    }
  });

  // Users routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await dbStorage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validated = insertUserSchema.parse(req.body);
      const user = await dbStorage.createUser(validated);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        if (error instanceof Error) {
        let message = error.message || "Invalid user data";
        // Enhance Zod validation error message
        if (error.name === "ZodError") {
          try {
            const zodError = JSON.parse(error.message);
            message = zodError.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
          } catch {
            // Keep original message if parsing fails
          }
        }
        res.status(400).json({ error: message });
      } else {
        res.status(400).json({ error: "Invalid user data" });
      }
      }
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const user = await dbStorage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const success = await dbStorage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Workflows routes
  app.get("/api/workflows", async (req, res) => {
    try {
      const workflows = await dbStorage.getAllWorkflows();
      res.json(workflows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.get("/api/workflows/:id", async (req, res) => {
    try {
      const workflow = await dbStorage.getWorkflowById(req.params.id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflow" });
    }
  });

  app.post("/api/workflows", async (req, res) => {
    try {
      const validated = insertWorkflowSchema.parse(req.body);
      const workflow = await dbStorage.createWorkflow(validated);
      res.status(201).json(workflow);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        if (error instanceof Error) {
        let message = error.message || "Invalid workflow data";
        // Enhance Zod validation error message
        if (error.name === "ZodError") {
          try {
            const zodError = JSON.parse(error.message);
            message = zodError.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
          } catch {
            // Keep original message if parsing fails
          }
        }
        res.status(400).json({ error: message });
      } else {
        res.status(400).json({ error: "Invalid workflow data" });
      }
      }
    }
  });

  app.patch("/api/workflows/:id", async (req, res) => {
    try {
      const workflow = await dbStorage.updateWorkflow(req.params.id, req.body);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      res.status(400).json({ error: "Failed to update workflow" });
    }
  });

  app.delete("/api/workflows/:id", async (req, res) => {
    try {
      const success = await dbStorage.deleteWorkflow(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete workflow" });
    }
  });

  app.post("/api/ai/generate-content", async (req, res) => {
    try {
      const { sectionTitle, sectionContent, sowId } = req.body;
      
      if (!sectionTitle || !sowId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const sow = await dbStorage.getSowById(sowId);
      if (!sow) {
        return res.status(404).json({ error: "SOW not found" });
      }

      const suggestion = await generateContentSuggestion(
        sectionTitle,
        sectionContent || "",
        {
          title: sow.title,
          vendorName: sow.vendorName,
          sowType: sow.sowType,
          requirements: sow.requirements || undefined,
        }
      );

      res.json({ suggestion });
    } catch (error) {
      console.error("AI generation error:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });

  // AI Section Analysis endpoint
  app.post("/api/ai/analyze-section", async (req, res) => {
    try {
      const { sectionTitle, sectionContent, sowId } = req.body;
      
      if (!sectionTitle || !sowId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const sow = await dbStorage.getSowById(sowId);
      if (!sow) {
        return res.status(404).json({ error: "SOW not found" });
      }

      const analysis = await analyzeSectionQuality(
        sectionTitle,
        sectionContent || "",
        {
          title: sow.title,
          vendorName: sow.vendorName,
          sowType: sow.sowType,
        }
      );

      res.json(analysis);
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ error: "Failed to analyze section" });
    }
  });

  // AI Inline Suggestion endpoint
  app.post("/api/ai/inline-suggestion", async (req, res) => {
    try {
      const { sectionTitle, currentText, cursorContext, sowId } = req.body;
      
      if (!sectionTitle || !sowId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const sow = await dbStorage.getSowById(sowId);
      if (!sow) {
        return res.status(404).json({ error: "SOW not found" });
      }

      const suggestion = await getInlineSuggestion(
        sectionTitle,
        currentText || "",
        cursorContext || "",
        {
          title: sow.title,
          vendorName: sow.vendorName,
          sowType: sow.sowType,
        }
      );

      res.json({ suggestion });
    } catch (error) {
      console.error("AI inline suggestion error:", error);
      res.status(500).json({ error: "Failed to get suggestion" });
    }
  });

  // AI Chat endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, sowId, history } = req.body;
      
      if (!message || !sowId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const sow = await dbStorage.getSowById(sowId);
      if (!sow) {
        return res.status(404).json({ error: "SOW not found" });
      }

      let sections = {};
      try {
        sections = typeof sow.sections === "string" ? JSON.parse(sow.sections) : sow.sections;
      } catch (e) {
        sections = sow.sections || {};
      }

      const response = await chatWithAI(
        message,
        {
          title: sow.title,
          vendorName: sow.vendorName,
          sowType: sow.sowType,
          sections,
          status: sow.status,
        },
        history || []
      );

      res.json({ response });
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ error: "Failed to chat with AI" });
    }
  });

  // AI Section Suggestions endpoint
  app.post("/api/ai/suggest-sections", async (req, res) => {
    try {
      const { sowId } = req.body;
      
      if (!sowId) {
        return res.status(400).json({ error: "Missing sowId" });
      }

      const sow = await dbStorage.getSowById(sowId);
      if (!sow) {
        return res.status(404).json({ error: "SOW not found" });
      }

      let sections = {};
      try {
        sections = typeof sow.sections === "string" ? JSON.parse(sow.sections) : sow.sections;
      } catch (e) {
        sections = sow.sections || {};
      }

      const existingSections = Object.values(sections).map((s: any) => s.title || "");

      console.log("[AI] Calling suggestSections with:", {
        title: sow.title,
        vendorName: sow.vendorName,
        sowType: sow.sowType,
        existingSectionsCount: existingSections.length
      });

      const suggestions = await suggestSections({
        title: sow.title,
        vendorName: sow.vendorName,
        sowType: sow.sowType,
        requirements: sow.requirements || undefined,
        existingSections,
      });

      console.log("[AI] Got suggestions:", suggestions.length);
      res.json({ suggestions });
    } catch (error) {
      console.error("AI section suggestions error:", error);
      res.status(500).json({ error: "Failed to get section suggestions" });
    }
  });

  // SOW Approvals routes
  // Get all approvals (for dashboard)
  app.get("/api/approvals", async (req, res) => {
    try {
      const approvals = await dbStorage.getAllApprovals();
      res.json(approvals);
    } catch (error) {
      console.error("Error getting all approvals:", error);
      res.status(500).json({ error: "Failed to get approvals" });
    }
  });

  app.get("/api/sows/:id/approvals", async (req, res) => {
    try {
      let approvals = await dbStorage.getSowApprovalsBySowId(req.params.id);
      if (!approvals || approvals.length === 0) {
        // No approvals exist, try to create them from workflow
        const sow = await dbStorage.getSowById(req.params.id);
        if (sow && sow.workflowId) {
          const workflow = await dbStorage.getWorkflowById(sow.workflowId);
          if (workflow && workflow.stages) {
            let stages;
            try {
              stages = typeof workflow.stages === "string" ? JSON.parse(workflow.stages) : workflow.stages;
            } catch (e) {
              stages = [];
            }
            if (Array.isArray(stages)) {
              const createdApprovals = [];
              for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
                const stage = stages[stageIdx];
                if (stage.reviewerIds && Array.isArray(stage.reviewerIds)) {
                  for (const reviewerId of stage.reviewerIds) {
                    const approval = await dbStorage.createSowApproval({
                      sowId: sow.id,
                      workflowId: sow.workflowId,
                      currentStage: stageIdx,
                      reviewerId,
                      status: "pending",
                    });
                    createdApprovals.push(approval);
                  }
                }
              }
              approvals = createdApprovals;
            }
          }
        }
      }
      res.json(approvals || []);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  });

  app.patch("/api/sow-approvals/:id", async (req, res) => {
    try {
      const { reviewerId, status, comments } = req.body;
      const approval = await dbStorage.updateSowApproval(req.params.id, {
        reviewerId,
        status,
        comments,
        reviewedAt: new Date(),
      });
      if (!approval) {
        return res.status(404).json({ error: "Approval not found" });
      }
      // Record an audit entry for this review action (approval status change)
      try {
        const userId = req.session?.userId || 'system';
        const previousApprovalStatus = status && status !== 'pending' ? 'pending' : undefined;
        await dbStorage.createSowAuditEntry({
          sowId: approval.sowId,
          action: 'reviewed',
          performedBy: userId,
          previousStatus: previousApprovalStatus,
          newStatus: status,
          remarks: comments,
          metadata: JSON.stringify({ approvalId: approval.id }),
        });
      } catch (auditErr) {
        console.warn('Failed to create audit entry for review action', auditErr);
      }
      // When an approval is updated to reviewed or approved, and the SOW is not yet in_review,
      // move it to in_review to reflect active review progress.
      try {
        if (status === 'reviewed' || status === 'approved') {
          const sow = await dbStorage.getSowById(approval.sowId);
          if (sow && (sow.status === 'draft' || sow.status === 'initiated' || sow.status === 'pending_review')) {
            const previousStatus = sow.status;
            await dbStorage.updateSow(sow.id, { status: 'in_review' });
            await dbStorage.createSowAuditEntry({
              sowId: sow.id,
              action: 'status_change',
              performedBy: req.session.userId || 'system',
              previousStatus,
              newStatus: 'in_review',
              remarks: 'Moved to In Review after approval activity',
            });
          }
        }
      } catch (e) {
        console.warn('Failed to transition SOW status after approval update', e);
      }
      res.json(approval);
    } catch (error) {
      res.status(500).json({ error: "Failed to update approval" });
    }
  });

  // Get audit trail for a SOW
  app.get("/api/sows/:id/audit", async (req, res) => {
    try {
      const auditTrail = await dbStorage.getSowAuditTrail(req.params.id);
      res.json(auditTrail);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit trail" });
    }
  });

  // Add audit trail entry
  app.post("/api/sows/:id/audit", async (req, res) => {
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { action, remarks, previousStatus, newStatus, previousReviewer, newReviewer, metadata } = req.body;
      const userId = req.session.userId;

      const entry = await dbStorage.createSowAuditEntry({
        sowId: req.params.id,
        action,
        performedBy: userId,
        previousStatus,
        newStatus,
        previousReviewer,
        newReviewer,
        remarks,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      });

      // If the SOW was in pending_review and an audit action occurred (e.g., reviewer_change, comment, stage_revert),
      // move it to in_review to indicate active review progress.
      try {
        const sow = await dbStorage.getSowById(req.params.id);
        if (sow && sow.status === 'pending_review' && action && action !== 'created' && action !== 'status_change') {
          const previous = sow.status;
          await dbStorage.updateSow(sow.id, { status: 'in_review' });
          await dbStorage.createSowAuditEntry({
            sowId: sow.id,
            action: 'status_change',
            performedBy: userId,
            previousStatus: previous,
            newStatus: 'in_review',
            remarks: `Auto-transitioned to in_review due to audit action: ${action}`,
          });
        }
      } catch (e) {
        console.warn('Failed to auto-transition SOW status after audit entry', e);
      }

      res.json(entry);
    } catch (error) {
      console.error("Audit trail error:", error);
      res.status(500).json({ error: "Failed to create audit entry" });
    }
  });

  // Revert SOW to previous stage
  app.post("/api/sows/:id/revert", async (req, res) => {
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { toStatus, remarks } = req.body;
      const userId = req.session.userId;

      if (!remarks) {
        return res.status(400).json({ error: "Remarks are required" });
      }

      const sow = await dbStorage.getSowById(req.params.id);
      if (!sow) {
        return res.status(404).json({ error: "SOW not found" });
      }

      const previousStatus = sow.status;

      // Update SOW status
      const updatedSow = await dbStorage.updateSow(req.params.id, {
        status: toStatus,
      });

      // Create audit trail entry
      await dbStorage.createSowAuditEntry({
        sowId: req.params.id,
        action: 'stage_revert',
        performedBy: userId,
        previousStatus,
        newStatus: toStatus,
        remarks,
      });

      res.json(updatedSow);
    } catch (error) {
      console.error("Revert error:", error);
      res.status(500).json({ error: "Failed to revert SOW" });
    }
  });

  // Reassign reviewer
  app.post("/api/sows/:id/reassign", async (req, res) => {
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { toReviewer, remarks } = req.body;
      const userId = req.session.userId;

      if (!remarks) {
        return res.status(400).json({ error: "Remarks are required" });
      }

      // Get current approval
      const approvals = await dbStorage.getSowApprovals(req.params.id);
      if (!approvals || approvals.length === 0) {
        return res.status(404).json({ error: "No approval record found" });
      }

      const currentApproval = approvals[0];
      const previousReviewerId = currentApproval.reviewerId;

      // Update approval reviewer
      const updatedApproval = await dbStorage.updateSowApproval(currentApproval.id, {
        reviewerId: toReviewer,
        status: 'pending',
        comments: null,
        reviewedAt: null,
      });

      // Create audit trail entry
      await dbStorage.createSowAuditEntry({
        sowId: req.params.id,
        action: 'reviewer_change',
        performedBy: userId,
        previousReviewer: previousReviewerId || undefined,
        newReviewer: toReviewer,
        remarks,
      });

      // If SOW is pending_review, transition to in_review because reviewer reassignment is an audit action
      try {
        const sow = await dbStorage.getSowById(req.params.id);
        if (sow && sow.status === 'pending_review') {
          const previous = sow.status;
          await dbStorage.updateSow(sow.id, { status: 'in_review' });
          await dbStorage.createSowAuditEntry({
            sowId: sow.id,
            action: 'status_change',
            performedBy: userId,
            previousStatus: previous,
            newStatus: 'in_review',
            remarks: 'Auto-transitioned to in_review due to reviewer reassignment',
          });
        }
      } catch (e) {
        console.warn('Failed to auto-transition SOW status after reviewer reassignment', e);
      }

      res.json(updatedApproval);
    } catch (error) {
      console.error("Reassign error:", error);
      res.status(500).json({ error: "Failed to reassign reviewer" });
    }
  });

  // Export route
  app.post("/api/sows/:id/export", async (req, res) => {
    try {
      const { format = "pdf", header, footer } = req.body;
      const sow = await dbStorage.getSowById(req.params.id);
      
      if (!sow) {
        return res.status(404).json({ error: "SOW not found" });
      }

      let sections: Record<string, any> = {};
      try {
        sections = typeof sow.sections === "string" ? JSON.parse(sow.sections) : sow.sections;
      } catch (e) {
        console.error("Error parsing sections:", e);
        sections = {};
      }

      let buffer: Buffer;
      let contentType: string;
      let filename: string;

      if (format === "word") {
        buffer = await generateWord(sow, sections, { format, header, footer });
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        filename = `${sow.title.replace(/\s+/g, "_")}_SOW.docx`;
      } else {
        buffer = await generatePDF(sow, sections, { format, header, footer });
        contentType = "application/pdf";
        filename = `${sow.title.replace(/\s+/g, "_")}_SOW.pdf`;
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export SOW" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
