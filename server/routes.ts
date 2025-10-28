import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, type IStorage } from "./storage";
import { PostgresStorage } from "./postgres-storage";
import { insertSowSchema, insertTemplateSchema } from "@shared/schema";
import { generateContentSuggestion } from "./openai";
import { seedDatabase } from "./seed";

let dbStorage: IStorage = storage;

// Initialize PostgreSQL storage if DATABASE_URL is available
async function initializeStorage() {
  if (process.env.DATABASE_URL) {
    try {
      const postgresStorage = new PostgresStorage();
      // Test connection
      await postgresStorage.getAllTemplates();
      dbStorage = postgresStorage;
      console.log("[storage] Using PostgreSQL storage");
      
      // Seed database with sample data
      await seedDatabase();
    } catch (error) {
      console.warn("[storage] PostgreSQL connection failed, using in-memory storage:", error instanceof Error ? error.message : String(error));
      dbStorage = storage;
    }
  } else {
    console.log("[storage] Using in-memory storage (no DATABASE_URL configured)");
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize storage before registering routes
  await initializeStorage();
  app.get("/api/sows", async (req, res) => {
    try {
      const sows = await dbStorage.getAllSows();
      res.json(sows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SOWs" });
    }
  });

  app.get("/api/sows/:id", async (req, res) => {
    try {
      const sow = await dbStorage.getSowById(req.params.id);
      if (!sow) {
        return res.status(404).json({ error: "SOW not found" });
      }
      res.json(sow);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SOW" });
    }
  });

  app.post("/api/sows", async (req, res) => {
    try {
      const validated = insertSowSchema.parse(req.body);
      const sow = await dbStorage.createSow(validated);
      res.status(201).json(sow);
    } catch (error) {
      res.status(400).json({ error: "Invalid SOW data" });
    }
  });

  app.patch("/api/sows/:id", async (req, res) => {
    try {
      const sow = await dbStorage.updateSow(req.params.id, req.body);
      if (!sow) {
        return res.status(404).json({ error: "SOW not found" });
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
        }
      );

      res.json({ suggestion });
    } catch (error) {
      console.error("AI generation error:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
