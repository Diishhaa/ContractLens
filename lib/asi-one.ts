export interface ContractAnalysisResult {
  simple_summary: string;
  key_points: string[];
  important_warnings: string[];
  questions_to_ask: string[];
  overall_explanation: string;
}

const ASI_ONE_API_KEY = process.env.ASI_ONE_API_KEY;
const ASI_ONE_BASE_URL = "https://api.asi1.ai/v1";

/**
 * Utility to extract JSON from a model response string.
 * Sometimes models wrap JSON in markdown code blocks.
 */
function cleanAndParseJSON(text: string): any {
  let cleaned = text.trim();
  
  // Strip markdown code block wrappers if they exist
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  cleaned = cleaned.trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Failed to parse JSON directly. Cleaned string was:", cleaned);
    // Attempt a regex-based fallback if JSON is still wrapped in other text
    const jsonRegex = /\{[\s\S]*\}/;
    const match = cleaned.match(jsonRegex);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerError) {
        throw new Error("Failed to parse JSON fallback pattern: " + (innerError as Error).message);
      }
    }
    throw error;
  }
}

/**
 * Analyzes the legal document text using the ASI:ONE API.
 */
export async function analyzeContract(contractText: string): Promise<ContractAnalysisResult> {
  if (!ASI_ONE_API_KEY) {
    throw new Error("ASI_ONE_API_KEY is not defined in the server environment variables.");
  }

  const systemPrompt = `You are an expert legal document simplification assistant.

Your job is to explain contracts to ordinary people with no legal background.

Do not provide legal advice.

Explain everything in simple English.

Highlight obligations, penalties, risks, restrictions, hidden fees, unusual clauses, and important conditions.

Respond only in valid JSON.

Format:
{
  "simple_summary": "Provide a 2-3 sentence overview explaining the contract in simple English.",
  "key_points": ["Point 1 (payment obligations)", "Point 2 (notice periods)", "Point 3 (renewal)", "etc."],
  "important_warnings": ["Warning 1 (e.g. hidden fees)", "Warning 2 (e.g. strict penalties)", "Warning 3 (e.g. auto-renewal)", "etc."],
  "questions_to_ask": ["Can fees increase later?", "What happens if I terminate early?", "Is there a penalty for cancellation?", "etc."],
  "overall_explanation": "A slightly longer simplified explanation of what the contract means for the user."
}`;

  try {
    const response = await fetch(`${ASI_ONE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ASI_ONE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "asi1-ultra", // Optimized for deep reasoning and contract audits
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the contract text to analyze:\n\n${contractText}` },
        ],
        response_format: { type: "json_object" }, // Ask for JSON response format
        temperature: 0.2, // Low temperature for high precision and compliance with JSON schema
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ASI:ONE API error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("ASI:ONE API returned an empty completion response.");
    }

    return cleanAndParseJSON(content) as ContractAnalysisResult;
  } catch (error) {
    console.error("Error in analyzeContract service:", error);
    throw error;
  }
}

/**
 * Handles follow-up user chats about the contract using ASI:ONE.
 */
export async function chatAboutContract(
  contractText: string,
  chatHistory: Array<{ role: "user" | "assistant" | "system"; content: string }>
): Promise<string> {
  if (!ASI_ONE_API_KEY) {
    throw new Error("ASI_ONE_API_KEY is not defined in the server environment variables.");
  }

  const systemPrompt = `You are ContractLens AI.

Answer questions only using information available in the uploaded contract.

If information is not present, clearly state that it is not mentioned in the document.

Always explain answers in simple English.

Do not provide legal advice.

Here is the contract context:\n\n${contractText}`;

  // Formulate the conversation history
  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
  ];

  try {
    const response = await fetch(`${ASI_ONE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ASI_ONE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "asi1", // Fast and conversational model
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ASI:ONE API error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("ASI:ONE API returned an empty completion response for chat.");
    }

    return content;
  } catch (error) {
    console.error("Error in chatAboutContract service:", error);
    throw error;
  }
}
