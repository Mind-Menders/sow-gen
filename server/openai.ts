import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// Charges are billed to your Replit credits.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
export const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export async function generateContentSuggestion(
  sectionTitle: string,
  sectionContent: string,
  sowContext: { title: string; vendorName: string; sowType: string }
): Promise<string> {
  const prompt = `You are an expert at writing Statement of Work (SOW) documents for enterprise projects.

Project Context:
- Project Title: ${sowContext.title}
- Vendor: ${sowContext.vendorName}
- SOW Type: ${sowContext.sowType}

Current Section: ${sectionTitle}
Current Content: ${sectionContent || "(empty)"}

Please generate professional, detailed content for this section of the SOW. The content should be:
1. Specific and actionable
2. Professional and formal in tone
3. Comprehensive and well-structured
4. Aligned with enterprise SOW best practices

Generate the content in plain text format (no markdown), ready to be inserted into the document.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
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

  return response.choices[0]?.message?.content || "";
}
