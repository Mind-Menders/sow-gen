import OpenAI from "openai";
import { Ollama } from "ollama";

// AI provider toggle. Set via env var `AI_PROVIDER`.
// Supported values:
// - "integrations" (default) — uses the existing Replit/OpenAI integrations client
// - "azure" — calls Azure OpenAI REST endpoint (configure AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT)
// - "olama" — calls an offline Olama inference endpoint (configure OLAMA_BASE_URL and OLAMA_MODEL)
const AI_PROVIDER = (process.env.AI_PROVIDER || "integrations").toLowerCase();

// Replit / OpenAI integrations client (keeps existing behavior)
export const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

/**
 * Helper: build the common SOW prompt
 */
function buildPrompt(
  sectionTitle: string, 
  sectionContent: string, 
  sowContext: { 
    title: string; 
    vendorName: string; 
    sowType: string;
    requirements?: string;
  }
) {
  return `You are an expert at writing Statement of Work (SOW) documents for enterprise projects.

Project Context:
- Project Title: ${sowContext.title}
- Vendor: ${sowContext.vendorName}
- SOW Type: ${sowContext.sowType}
${sowContext.requirements ? `- Requirements: ${sowContext.requirements}` : ''}

Current Section: ${sectionTitle}
Current Content: ${sectionContent || "(empty)"}

Please generate professional, detailed content for this section of the SOW. The content should be:
1. Specific and actionable
2. Professional and formal in tone
3. Comprehensive and well-structured
4. Aligned with enterprise SOW best practices
${sowContext.requirements ? '5. Address the specified requirements above' : ''}

Generate the content in plain text format (no markdown), ready to be inserted into the document.`;
}

/**
 * Generate content suggestion using the configured AI provider.
 * Environment configuration:
 * - For integrations (default): AI_INTEGRATIONS_OPENAI_BASE_URL, AI_INTEGRATIONS_OPENAI_API_KEY
 * - For azure: AZURE_OPENAI_ENDPOINT (eg https://your-resource.openai.azure.com), AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT
 * - For olama: OLAMA_BASE_URL (eg http://localhost:11434), OLAMA_MODEL (model name)
 */
export async function generateContentSuggestion(
  sectionTitle: string,
  sectionContent: string,
  sowContext: { 
    title: string; 
    vendorName: string; 
    sowType: string;
    requirements?: string;
  }
): Promise<string> {
  const prompt = buildPrompt(sectionTitle, sectionContent, sowContext);

  console.log(`[AI] Provider=${AI_PROVIDER} Generating content for section:`, sectionTitle);

  if (AI_PROVIDER === "olama") {
    // Offline Olama: use the official Ollama SDK
    const host = process.env.OLAMA_BASE_URL || "http://localhost:11434";
    const model = process.env.OLAMA_MODEL || "llama2";
    
    try {
      const ollama = new Ollama({ host });
      console.log(`[AI:olama] Generating with model: ${model}`);
      
      const response = await ollama.generate({
        model,
        prompt,
        stream: false,
      });
      
      const text = response.response || "";
      console.log("[AI:olama] response length:", text.length, "characters");
      return text;
    } catch (err: any) {
      // On Windows 'localhost' can resolve to ::1 (IPv6) and some local servers only bind to 127.0.0.1.
      // If we get ECONNREFUSED for localhost, retry using 127.0.0.1 once.
      const causeCode = err?.cause?.code || err?.code;
      if (causeCode === "ECONNREFUSED" && host.includes("localhost")) {
        try {
          const ipv4Host = host.replace("localhost", "127.0.0.1");
          console.warn("[AI:olama] Connection refused on localhost; retrying with 127.0.0.1");
          const ollama = new Ollama({ host: ipv4Host });
          
          const response = await ollama.generate({
            model,
            prompt,
            stream: false,
          });
          
          const text = response.response || "";
          console.log("[AI:olama] response length (ipv4 retry):", text.length, "characters");
          return text;
        } catch (err2) {
          console.error("[AI:olama] Retry with 127.0.0.1 also failed:", err2);
          throw err2;
        }
      }
      console.error("[AI:olama] Error:", err);
      throw err;
    }
  }

  if (AI_PROVIDER === "azure") {
    // Azure OpenAI REST API
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const key = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    if (!endpoint || !key || !deployment) throw new Error("AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY and AZURE_OPENAI_DEPLOYMENT must be set when AI_PROVIDER=azure");

    try {
      const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=2024-11-01-preview`;
      const body = {
        messages: [
          { role: "system", content: "You are an expert SOW writer who creates professional, detailed content for enterprise Statement of Work documents." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1024,
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": key },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "";
      console.log("[AI:azure] response length:", (content || "").length);
      return content || "";
    } catch (err) {
      console.error("[AI:azure] Error:", err);
      throw err;
    }
  }

  // Default: use the existing OpenAI / Replit Integrations client
  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_INTEGRATIONS_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert SOW writer who creates professional, detailed content for enterprise Statement of Work documents."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_completion_tokens: 1024,
    });

    const content = response.choices?.[0]?.message?.content || "";
    console.log("[AI:integrations] Response length:", content.length, "characters");
    return content;
  } catch (error) {
    console.error("[AI] Error calling OpenAI integrations:", error);
    throw error;
  }
}
