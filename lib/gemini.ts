import { GoogleAuth } from "google-auth-library";
import { GoogleGenAI } from "@google/genai";

// Initialize Google Auth using the same credentials we use for Firebase Admin
// This avoids needing a separate API Key, instead leveraging the Google Cloud project
const auth = new GoogleAuth({
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    private_key: (process.env.FIREBASE_PRIVATE_KEY || "")
      .replace(/^"|"$/g, "")
      .replace(/\\n/g, "\n"),
  },
  projectId: process.env.FIREBASE_PROJECT_ID,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

export const ai = new GoogleGenAI({
  vertexai: {
    project: process.env.FIREBASE_PROJECT_ID || "",
    location: "us-central1", // Or your preferred GCP region
  },
  auth: auth,
});
