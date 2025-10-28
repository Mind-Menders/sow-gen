import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSowSchema, insertTemplateSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/sows", async (req, res) => {
    try {
      const sows = await storage.getAllSows();
      res.json(sows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SOWs" });
    }
  });

  app.get("/api/sows/:id", async (req, res) => {
    try {
      const sow = await storage.getSowById(req.params.id);
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
      const sow = await storage.createSow(validated);
      res.status(201).json(sow);
    } catch (error) {
      res.status(400).json({ error: "Invalid SOW data" });
    }
  });

  app.patch("/api/sows/:id", async (req, res) => {
    try {
      const sow = await storage.updateSow(req.params.id, req.body);
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
      const success = await storage.deleteSow(req.params.id);
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
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplateById(req.params.id);
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
      const template = await storage.createTemplate(validated);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ error: "Invalid template data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
