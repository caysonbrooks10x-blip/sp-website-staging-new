import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

import { requireEnv } from "./env";

// In production, requireEnv throws if any of these are missing or are
// placeholder values — the app must not boot with demo Firebase creds.
// In development, requireEnv logs a warning and returns the dev fallback
// so local iteration continues to work even without a populated .env.local.
const firebaseConfig = {
    apiKey: requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY", { devFallback: "AIzaSyDUMMY12345678901234567890123456789" }),
    authDomain: requireEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", { devFallback: "demo.firebaseapp.com" }),
    projectId: requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", { devFallback: "demo-project" }),
    storageBucket: requireEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", { devFallback: "demo.appspot.com" }),
    messagingSenderId: requireEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", { devFallback: "1234567890" }),
    appId: requireEnv("NEXT_PUBLIC_FIREBASE_APP_ID", { devFallback: "1:1234567890:web:demo" }),
    measurementId: requireEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", { devFallback: "G-DEMO0000", silent: true })
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
export const storage = getStorage(app);
