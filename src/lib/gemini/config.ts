import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

type SafetySetting = {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
};

// Environment validation
function validateEnvironment() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please add it to your .env.local file."
    );
  }

  if (apiKey === "YOUR_GEMINI_API_KEY") {
    throw new Error(
      "Please replace YOUR_GEMINI_API_KEY with your actual Gemini API key in .env.local"
    );
  }

  return apiKey;
}

// Gemini configuration
export const geminiConfig = {
  apiKey: validateEnvironment(),
  model: process.env.GEMINI_MODEL || "gemini-1.5-pro-latest",
  maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || "8192"),
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE || "0.7"),
  rateLimits: {
    perMinute: parseInt(process.env.GEMINI_RATE_LIMIT_PER_MINUTE || "60"),
    perHour: parseInt(process.env.GEMINI_RATE_LIMIT_PER_HOUR || "1000"),
  },
};

// Initialize Gemini AI client
export const genAI = new GoogleGenerativeAI(geminiConfig.apiKey);

// Get the model instance
export const getGeminiModel = () => {
  return genAI.getGenerativeModel({
    model: geminiConfig.model,
    generationConfig: {
      temperature: geminiConfig.temperature,
      maxOutputTokens: geminiConfig.maxTokens,
    },
  });
};

// Safety settings for enterprise use
export const safetySettings: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];
