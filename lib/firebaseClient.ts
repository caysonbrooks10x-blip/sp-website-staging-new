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
// Static `process.env.NEXT_PUBLIC_*` references are required here so
// Next.js DefinePlugin can inline the real values into the client bundle.
// Dynamic access (`process.env[name]`) is NOT inlined and resolves to
// undefined in the browser, which caused the production crash.
const firebaseConfig = {
    apiKey: requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY", {
        raw: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        devFallback: "AIzaSyDUMMY12345678901234567890123456789",
        previewFallback: "AIzaSyDNXjEpfcCG9GbP-8p8y6MOC1cKreRb_mg",
    }),
    authDomain: requireEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", {
        raw: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        devFallback: "demo.firebaseapp.com",
        previewFallback: "studiox-b25cf.firebaseapp.com",
    }),
    projectId: requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", {
        raw: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        devFallback: "demo-project",
        previewFallback: "studiox-b25cf",
    }),
    storageBucket: requireEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", {
        raw: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        devFallback: "demo.appspot.com",
        previewFallback: "studiox-b25cf.firebasestorage.app",
    }),
    messagingSenderId: requireEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", {
        raw: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        devFallback: "1234567890",
        previewFallback: "855089927355",
    }),
    appId: requireEnv("NEXT_PUBLIC_FIREBASE_APP_ID", {
        raw: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        devFallback: "1:1234567890:web:demo",
        previewFallback: "1:855089927355:web:885d59a59b6dba328fc59e",
    }),
    measurementId: requireEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", {
        raw: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
        devFallback: "G-DEMO0000",
        previewFallback: "G-3C2M4EW848",
        silent: true,
    })
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
export const storage = getStorage(app);
