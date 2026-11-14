import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Active Gemini models with automatic fallback.
// gemini-2.0-flash / gemini-2.0-flash-lite are discontinued (404).
// Updated Nov 2026 — use the currently available Flash family.
const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite", // Primary — high-volume, low-latency, recommended
  "gemini-3.6-flash",      // Fallback 1
  "gemini-3.8-flash",      // Fallback 2
];

/**
 * Executes prompt against active Gemini models with automatic fallback.
 * Returns parsed JSON object from the AI response.
 */
export const generateGeminiJSON = async (systemPrompt) => {
  let lastError = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[Gemini API] Trying model: ${modelName}`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(systemPrompt);
      const responseText = result.response.text();

      return JSON.parse(responseText);
    } catch (error) {
      console.warn(
        `[Gemini Warning] Model "${modelName}" failed: ${error.message}. Trying next…`,
      );
      lastError = error;
    }
  }

  throw new Error(`All Gemini models failed: ${lastError?.message}`);
};
