// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAGHvLa48i5-rbHA_5jZEQOb3-5-BZCjTc",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "briefcraftai.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "briefcraftai",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "briefcraftai.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1094312956483",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1094312956483:web:c8e40d2035aaefecc67af6",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-KXZXDTX7FF",
};

// Initialize Firebase
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let analytics: Analytics | null = null;

// Safe client-side analytics initialization
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (analytics) return analytics;

  try {
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(app);
      return analytics;
    }
  } catch (err) {
    console.warn("Firebase Analytics initialization skipped:", err);
  }
  return null;
}
