import { generateContentSuggestion } from "./openai";
import type { Sow, SowSections } from "@shared/schema";

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
      const aiContent = await generateContentSuggestion(
        section.title,
        "",
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
