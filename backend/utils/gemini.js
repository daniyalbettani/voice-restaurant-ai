import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Active Gemini models with automatic fallback
const CANDIDATE_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

/**
 * Executes prompt against active Gemini models with automatic fallback.
 */
export const generateGeminiJSON = async (systemPrompt) => {
  let lastError = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[Gemini API] Trying active model: ${modelName}`);

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
        `[Gemini Warning] Model ${modelName} failed or busy. Trying next...`,
      );
      lastError = error;
    }
  }

  throw new Error(`All Gemini models failed: ${lastError?.message}`);
};
