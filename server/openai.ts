import OpenAI, { AzureOpenAI } from "openai";
import { Ollama } from "ollama";

// AI provider toggle. Set via env var `AI_PROVIDER`.
// Supported values:
// - "integrations" (default) — uses the existing Replit/OpenAI integrations client
// - "azure" — uses AzureOpenAI SDK client (configure AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT, optional AZURE_OPENAI_API_VERSION)
// - "olama" — calls an offline Olama inference endpoint (configure OLAMA_BASE_URL and OLAMA_MODEL)
const AI_PROVIDER = (process.env.AI_PROVIDER || "integrations").toLowerCase();

// Replit / OpenAI integrations client (keeps existing behavior)
export const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Lazily initialize Azure client (when used)
let cachedAzureClient: AzureOpenAI | null = null;
function getAzureClient(): AzureOpenAI {
  if (cachedAzureClient) return cachedAzureClient;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-04-01-preview";
  if (!endpoint || !apiKey || !deployment) {
    throw new Error("AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, and AZURE_OPENAI_DEPLOYMENT must be set when AI_PROVIDER=azure");
  }
  cachedAzureClient = new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion });
  return cachedAzureClient;
}

/**
 * Add proper spacing to AI-generated HTML content
 * Ensures headings have adequate spacing and line breaks
 */
function addProperSpacing(html: string): string {
  if (!html) return html;
  
  // Add spacing after headings (h2, h3, h4)
  html = html.replace(/(<\/h2>)/gi, '$1<br>');
  html = html.replace(/(<\/h3>)/gi, '$1<br>');
  html = html.replace(/(<\/h4>)/gi, '$1<br>');

  // Remove double spacing at the beginning
  html = html.replace(/^(<br>\s*)+/i, '');

  // Add spacing between paragraphs and lists
  html = html.replace(/(<\/p>)(\s*)(<p>)/gi, '$1<br>$3');
  html = html.replace(/(<\/ul>|<\/ol>)(\s*)(<p>)/gi, '$1<br>$3');
  html = html.replace(/(<\/p>)(\s*)(<ul>|<ol>)/gi, '$1<br>$3');

  // Remove repeated empty paragraphs and <p><br></p>
  html = html.replace(/(<p>(\s|<br\s*\/?>)*<\/p>)+/gi, '');

  return html;
}


function buildPrompt(
  sectionTitle: string, 
  sectionContent: string, 
  sowContext: { 
    title: string; 
    vendorName: string; 
    sowType: string;
    requirements?: string;
    startDate?: string;
    endDate?: string;
    client?: string;
  }
) {
  return `You are an expert at writing Statement of Work (SOW) documents for enterprise projects.

Project Context:
- Project Title: ${sowContext.title}
- Vendor: ${sowContext.vendorName}
- Client: ${sowContext.client || 'Emirates'}
- SOW Type: ${sowContext.sowType}
${sowContext.requirements ? `- Requirements: ${sowContext.requirements}` : ''}

${sowContext.startDate && sowContext.endDate ? `Include timelines in the generated content based on the start date ${sowContext.startDate} and end date ${sowContext.endDate}.` : ''}
Current Section: ${sectionTitle}
Current Content: ${sectionContent || "(empty)"}

Generate professional, detailed content strictly only for this ${sectionTitle} section of the SOW. The content should be:
1. Specific and actionable
2. Professional and formal in tone
3. Comprehensive and well-structured
4. Aligned with enterprise SOW best practices
${sowContext.requirements ? '5. Address the specified requirements above' : ''}

Output format requirements:
- Respond with CLEAN HTML only (no markdown, no code fences, no explanations)
- Do NOT include <html>, <head>, or <body> tags; return an HTML fragment
- Start with a top-level heading for the section title using <h2>${sectionTitle}</h2>
- Use <h3> and <h4> for subheadings
- IMPORTANT: Add line breaks between sections - use <br> tags after headings and between major content blocks
- Use semantic elements (p, ul/ol, table, thead, tbody, tr, th, td)
- Keep links absolute text only (no external JS or inline scripts/styles)
- Ensure proper spacing: headings should be followed by line breaks before content

Return ONLY the HTML fragment with proper spacing. Do NOT use empty paragraphs for spacing.`;
}

/**
 * Generate content suggestion using the configured AI provider.
 * Environment configuration:
 * - For integrations (default): AI_INTEGRATIONS_OPENAI_BASE_URL, AI_INTEGRATIONS_OPENAI_API_KEY
 * - For azure (SDK): AZURE_OPENAI_ENDPOINT (eg https://your-resource.openai.azure.com), AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT, optional AZURE_OPENAI_API_VERSION
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
    startDate?: string;
    endDate?: string;
    client?: string;
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
      
      let text = response.response || "";
      // Remove any accidental markdown code fences
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:html|markdown)?\s*/i, '').replace(/```\s*$/i, '').trim();
      }
      // Add proper spacing to generated content
      text = addProperSpacing(text);
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
          
          let text = response.response || "";
          // Add proper spacing to generated content
          text = addProperSpacing(text);
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
    // Azure OpenAI via official SDK
    try {
      const client = getAzureClient();
      const model = process.env.AZURE_OPENAI_DEPLOYMENT!; // deployment name
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: "You are an expert SOW writer who creates professional, detailed content for enterprise Statement of Work documents." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1024,
      });
  let content = response?.choices?.[0]?.message?.content || "";
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:html|markdown)?\s*/i, '').replace(/```\s*$/i, '').trim();
      }
      // Add proper spacing to generated content
      content = addProperSpacing(content);
      console.log("[AI:azure-sdk] response length:", (content || "").length);
      return content || "";
    } catch (err) {
      console.error("[AI:azure-sdk] Error:", err);
      throw err;
    }
  }

  // Default: OpenAI integrations
  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_INTEGRATIONS_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert SOW writer who creates professional, detailed content for enterprise Statement of Work documents." },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 1024,
    });
    
    let content = response.choices?.[0]?.message?.content || "";
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:html|markdown)?\s*/i, '').replace(/```\s*$/i, '').trim();
    }
    console.log("[AI:integrations] response length:", content.length, "characters");
    // If the model still returned markdown (no HTML tags), perform a minimal conversion for headings and paragraphs
    if (!/[<>]/.test(content)) {
      const lines = content.split(/\r?\n/);
      const htmlLines: string[] = [];
      let inUL = false;
      let inOL = false;
      const closeLists = () => {
        if (inUL) { htmlLines.push('</ul>'); inUL = false; }
        if (inOL) { htmlLines.push('</ol>'); inOL = false; }
      };
      for (const line of lines) {
        if (/^###\s+/.test(line)) { closeLists(); htmlLines.push(`<h4>${line.replace(/^###\s+/, '')}</h4>`); continue; }
        if (/^##\s+/.test(line)) { closeLists(); htmlLines.push(`<h3>${line.replace(/^##\s+/, '')}</h3>`); continue; }
        if (/^#\s+/.test(line)) { closeLists(); htmlLines.push(`<h2>${line.replace(/^#\s+/, '')}</h2>`); continue; }
        if (/^\s*[-*]\s+/.test(line)) {
          if (!inUL) { closeLists(); htmlLines.push('<ul>'); inUL = true; }
          htmlLines.push(`<li>${line.replace(/^\s*[-*]\s+/, '')}</li>`);
          continue;
        }
        if (/^\s*\d+\.\s+/.test(line)) {
          if (!inOL) { closeLists(); htmlLines.push('<ol>'); inOL = true; }
          htmlLines.push(`<li>${line.replace(/^\s*\d+\.\s+/, '')}</li>`);
          continue;
        }
        if (line.trim() === '') { closeLists(); continue; }
        htmlLines.push(`<p>${line}</p>`);
      }
      closeLists();
      content = `<h2>${sectionTitle}</h2>\n` + htmlLines.join('\n');
    }
    // Add proper spacing to generated content
    content = addProperSpacing(content);
    return content;
  } catch (err) {
    console.error("[AI:integrations] Error:", err);
    throw err;
  }
}

/**
 * Generic AI completion function that can be used for any prompt
 */
async function aiComplete(systemPrompt: string, userPrompt: string, options: { maxTokens?: number } = {}): Promise<string> {
  const maxTokens = options.maxTokens || 2048;
  
  console.log(`[AI] Provider=${AI_PROVIDER} Generic completion`);

  if (AI_PROVIDER === "olama") {
    const host = process.env.OLAMA_BASE_URL || "http://localhost:11434";
    const model = process.env.OLAMA_MODEL || "llama2";
    
    try {
      const ollama = new Ollama({ host });
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
      const response = await ollama.generate({
        model,
        prompt: fullPrompt,
        stream: false,
      });
      
      return response.response || "";
    } catch (err: any) {
      const causeCode = err?.cause?.code || err?.code;
      if (causeCode === "ECONNREFUSED" && host.includes("localhost")) {
        const ipv4Host = host.replace("localhost", "127.0.0.1");
        console.warn("[AI:olama] Connection refused on localhost; retrying with 127.0.0.1");
        const ollama = new Ollama({ host: ipv4Host });
        
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
        const response = await ollama.generate({
          model,
          prompt: fullPrompt,
          stream: false,
        });
        
        return response.response || "";
      }
      throw err;
    }
  }

  if (AI_PROVIDER === "azure") {
    const client = getAzureClient();
    const model = process.env.AZURE_OPENAI_DEPLOYMENT!;
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: maxTokens,
    });
  return response?.choices?.[0]?.message?.content || "";
  }

  // Default: OpenAI integrations
  const response = await openai.chat.completions.create({
    model: process.env.AI_INTEGRATIONS_MODEL || "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    max_completion_tokens: maxTokens,
  });

  return response.choices?.[0]?.message?.content || "";
}

/**
 * Analyze SOW section content and provide quality insights
 */
export async function analyzeSectionQuality(
  sectionTitle: string,
  sectionContent: string,
  sowContext: { title: string; vendorName: string; sowType: string }
): Promise<{
  score: number;
  clarity: number;
  relevance: number;
  completeness: number;
  issues: string[];
  suggestions: string[];
  missingInfo: string[];
}> {
  const prompt = `Analyze this SOW section and provide a detailed quality assessment.

Project: ${sowContext.title}
Vendor: ${sowContext.vendorName}
Section: ${sectionTitle}
Content: ${sectionContent || "(empty)"}

You MUST respond with ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or explanatory text. Make sure scoring is purely based on the content provided above, make the scoring 0 if no content present.
Use this exact format:
{"score": 85, "clarity": 90, "relevance": 80, "completeness": 85, "issues": ["issue1"], "suggestions": ["suggestion1"], "missingInfo": ["missing1"]}

Your response:`;

  try {
    const result = await aiComplete(
      "You are an expert SOW quality analyst. You MUST respond ONLY with a valid JSON object, no markdown, no code blocks, no explanations.",
      prompt,
      { maxTokens: 1024 }
    );
    
    // Clean up response - remove markdown code blocks if present
    let jsonString = result.trim();
    
    // Remove ```json and ``` markers if present
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Remove any leading/trailing text that's not part of JSON
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
    
    console.log("[AI] Parsing JSON response:", jsonString.substring(0, 200));
    
    // Parse JSON response
    const parsed = JSON.parse(jsonString.trim());
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      clarity: typeof parsed.clarity === 'number' ? parsed.clarity : 0,
      relevance: typeof parsed.relevance === 'number' ? parsed.relevance : 0,
      completeness: typeof parsed.completeness === 'number' ? parsed.completeness : 0,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo : []
    };
  } catch (error) {
    console.error("[AI] Error analyzing section:", error);
    // Return default values on error
    return {
      score: 0,
      clarity: 0,
      relevance: 0,
      completeness: 0,
      issues: ["Analysis temporarily unavailable. Please try again."],
      suggestions: [],
      missingInfo: []
    };
  }
}

/**
 * Get inline content suggestions based on current text
 */
export async function getInlineSuggestion(
  sectionTitle: string,
  currentText: string,
  cursorContext: string,
  sowContext: { title: string; vendorName: string; sowType: string }
): Promise<string> {
  const prompt = `You are an AI writing assistant for SOW documents.

Project: ${sowContext.title}
Section: ${sectionTitle}
Current text: ${currentText}
User is typing: "${cursorContext}"

Suggest a short, relevant continuation (1-2 sentences max) that the user can insert. Be specific and contextual.
Respond with ONLY the suggested text, no explanations.`;

  try {
    const result = await aiComplete(
      "You are a helpful SOW writing assistant. Provide concise, contextual suggestions.",
      prompt,
      { maxTokens: 256 }
    );
    return result.trim();
  } catch (error) {
    console.error("[AI] Error getting inline suggestion:", error);
    return "";
  }
}

/**
 * Chat with AI about the SOW
 */
export async function chatWithAI(
  userMessage: string,
  sowData: {
    title: string;
    vendorName: string;
    sowType: string;
    sections: any;
    status: string;
  },
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  const sowSummary = `
Project: ${sowData.title}
Vendor: ${sowData.vendorName}
Type: ${sowData.sowType}
Status: ${sowData.status}
Sections: ${Object.keys(sowData.sections || {}).map(key => sowData.sections[key]?.title).filter(Boolean).join(", ")}
  `.trim();

  const systemPrompt = `You are an expert SOW assistant helping users create and improve Statement of Work documents.

Current SOW Context:
${sowSummary}

Answer questions about the SOW, provide suggestions, and help users improve their content. Be concise and helpful.`;

  try {
    // Build conversation with history
    let messages = conversationHistory.slice(-6); // Keep last 6 messages for context
    messages.push({ role: "user", content: userMessage });
    
    // For providers that don't support conversation history, combine into one prompt
    const combinedPrompt = messages.map(m => `${m.role}: ${m.content}`).join("\n\n");
    
    const result = await aiComplete(systemPrompt, combinedPrompt, { maxTokens: 512 });
    return result.trim();
  } catch (error) {
    console.error("[AI] Error in chat:", error);
    return "I'm sorry, I'm having trouble responding right now. Please try again.";
  }
}

/**
 * Suggest additional sections that would be beneficial for the SOW.
 */
export async function suggestSections(
  sowContext: { 
    title: string; 
    vendorName: string; 
    sowType: string;
    requirements?: string;
    existingSections: string[]; // Array of existing section titles
  }
): Promise<Array<{ title: string; icon: string; description: string }>> {
  console.log(`[AI] Provider=${AI_PROVIDER} Suggesting sections for ${sowContext.sowType}`);
  
  const systemPrompt = "You are an expert SOW document consultant. Always return valid JSON arrays with no markdown.";
  
  const userPrompt = `You are an expert at structuring Statement of Work (SOW) documents.

Current SOW Information:
- Project: ${sowContext.title}
- Vendor: ${sowContext.vendorName}
- Type: ${sowContext.sowType}
${sowContext.requirements ? `- Requirements: ${sowContext.requirements}` : ''}

Existing Sections:
${sowContext.existingSections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Based on the SOW type and existing sections, suggest 3-5 additional sections that would strengthen this SOW. Consider common enterprise SOW best practices.

Return ONLY a valid JSON array with no code fences or markdown. Each object must have:
- title: Section name (e.g., "Risk Management")
- icon: Two-letter abbreviation (e.g., "RM")
- description: Brief explanation of why this section is valuable (1 sentence)

Example format:
[
  {
    "title": "Risk Management",
    "icon": "RM",
    "description": "Identifies potential risks and mitigation strategies for project success."
  }
]`;

  try {
    const response = await aiComplete(systemPrompt, userPrompt, { maxTokens: 1024 });
    
    console.log("[AI] Raw section suggestions response:", response);
    
    // Robust JSON parsing
    let cleaned = response.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    
    // Try to extract JSON array if embedded in text
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    const suggestions = JSON.parse(cleaned);
    
    if (!Array.isArray(suggestions)) {
      throw new Error("Response is not an array");
    }
    
    // Validate structure
    const validSuggestions = suggestions
      .filter((s: any) => s.title && s.icon && s.description)
      .map((s: any) => ({
        title: String(s.title),
        icon: String(s.icon).substring(0, 2).toUpperCase(),
        description: String(s.description)
      }))
      .slice(0, 5); // Max 5 suggestions
    
    console.log("[AI] Parsed suggestions:", validSuggestions.length);
    return validSuggestions;
      
  } catch (error) {
    console.error("[AI] Failed to parse section suggestions:", error);
    // Return fallback suggestions based on SOW type
    console.log("[AI] Using fallback suggestions");
    return getDefaultSectionSuggestions(sowContext.sowType, sowContext.existingSections);
  }
}

/**
 * Fallback section suggestions if AI parsing fails.
 */
function getDefaultSectionSuggestions(
  sowType: string, 
  existingSections: string[]
): Array<{ title: string; icon: string; description: string }> {
  const allSuggestions = [
    { title: "Risk Management", icon: "RM", description: "Identifies potential risks and mitigation strategies for project success." },
    { title: "Dependencies", icon: "DP", description: "Documents external dependencies and their impact on project timeline." },
    { title: "Acceptance Criteria", icon: "AC", description: "Defines clear criteria for deliverable acceptance and sign-off." },
    { title: "Change Management", icon: "CM", description: "Establishes process for handling scope changes and amendments." },
    { title: "Communication Plan", icon: "CP", description: "Outlines communication protocols, meeting cadence, and reporting." },
    { title: "Quality Assurance", icon: "QA", description: "Defines quality standards and testing requirements." },
    { title: "Budget & Costs", icon: "BC", description: "Details cost breakdown, payment terms, and financial milestones." },
    { title: "Training & Support", icon: "TS", description: "Specifies training requirements and ongoing support arrangements." },
  ];
  
  // Filter out sections that already exist (fuzzy match)
  const existingTitlesLower = existingSections.map(s => s.toLowerCase());
  return allSuggestions
    .filter(s => !existingTitlesLower.some(existing => 
      existing.includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(existing)
    ))
    .slice(0, 5);
}

