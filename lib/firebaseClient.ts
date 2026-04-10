import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    // Fallback values keep local/CI builds from crashing when envs are missing or empty.
    // Real Firebase access still requires valid NEXT_PUBLIC_FIREBASE_* values.
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || "AIzaSyDUMMY12345678901234567890123456789",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || "demo.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "demo-project",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || "demo.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || "1234567890",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || "1:1234567890:web:demo",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim() || "G-DEMO0000"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
export const storage = getStorage(app);
