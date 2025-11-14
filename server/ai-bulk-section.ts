import { generateContentSuggestion } from "./openai";
import type { Sow, SowSections } from "@shared/schema";
import { retrieveRelevantChunks } from "./vector-storage";

/**
 * Generate AI content for all sections of a SOW.
 * Returns a new sections object with content filled in.
 * Generates content for ALL sections, replacing any existing content.
 */
export async function generateAllSectionsAI(
  sow: Sow,
  sections: SowSections
): Promise<SowSections> {
  const out: SowSections = { ...sections };
  
  // Generate AI content for ALL sections (not just empty ones)
  for (const key of Object.keys(out)) {
    const section = out[key];
    try {
      console.log(`[AI Bulk] Generating content for section: ${section.title}`);
      // Retrieve relevant reference context from ChromaDB using selected document IDs and sowReference
      let referenceContext = "";
      // Parse referenceDocumentIds if present (comma-separated string)
      let docIds: string[] = [];
      if (typeof sow.referenceDocumentIds === "string" && sow.referenceDocumentIds.length > 0) {
        docIds = sow.referenceDocumentIds.split(",").map(id => id.trim()).filter(Boolean);
      }
      if (docIds.length > 0) {
        const query = sow.sowReference || section.title;
        let allChunks: string[] = [];
        for (const docId of docIds) {
          const chunks = await retrieveRelevantChunks(query + " " + docId, 3, docId);
          allChunks = allChunks.concat(chunks);
        }
        if (allChunks.length > 0) {
          referenceContext = `Reference Context:\n${allChunks.join("\n\n")}`;
        }
      }
      const aiContent = await generateContentSuggestion(
        section.title,
        referenceContext,
        {
          title: sow.title,
          vendorName: sow.vendorName,
          sowType: sow.sowType,
          requirements: sow.requirements || undefined,
        }
      );
      out[key] = { ...section, content: aiContent };
      console.log(`[AI Bulk] Successfully generated content for: ${section.title}`);
    } catch (e) {
      console.error(`[AI Bulk] Failed to generate content for ${section.title}:`, e);
      // If AI fails, leave content empty
      out[key] = { ...section, content: "" };
    }
  }
  
  return out;
}
