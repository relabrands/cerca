import { GoogleAuth } from "google-auth-library";
import { GoogleGenAI } from "@google/genai";

/**
 * Returns a Vertex-AI backed GoogleGenAI client.
 * Called lazily inside API route handlers so env vars are available at
 * request time (not at build/SSG collection time).
 */
export function getAI(): GoogleGenAI {
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "")
    .replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n");

  const googleAuth = new GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    projectId: process.env.FIREBASE_PROJECT_ID,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  return new GoogleGenAI({
    vertexai: true,
    project: process.env.FIREBASE_PROJECT_ID,
    location: "us-central1",
    // @ts-expect-error – the SDK accepts a GoogleAuth instance via this field
    googleAuth,
  });
}


