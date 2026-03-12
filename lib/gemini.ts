import { GoogleGenAI } from "@google/genai";

/**
 * Returns a Gemini AI client using the GEMINI_API_KEY environment variable.
 * Initialized lazily inside route handlers so the env var is read at request
 * time, not at build/SSG time.
 *
 * Get a free API key at: https://aistudio.google.com/app/apikey
 * Add it to Vercel as environment variable: GEMINI_API_KEY
 */
export function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY environment variable. " +
        "Get a free key at https://aistudio.google.com/app/apikey and add it to Vercel."
    );
  }
  return new GoogleGenAI({ apiKey });
}



