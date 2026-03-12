// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDbtOWm4D-W_sPdfuq7R7how91hi8XPWwM",
  authDomain: "cerca-rela.firebaseapp.com",
  projectId: "cerca-rela",
  storageBucket: "cerca-rela.firebasestorage.app",
  messagingSenderId: "568945874491",
  appId: "1:568945874491:web:9789f114504c5adae52e1e",
  measurementId: "G-BPP3DCS1VY"
};

// Initialize Firebase (singleton pattern for Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics safely (it needs to run in the browser)
let analytics = null;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, analytics, auth, db };
