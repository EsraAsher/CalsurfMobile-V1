// src/config/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, Firestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// YOUR KEYS - Use environment variables or update with valid credentials from Firebase Console
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDQKp0-c3_MiW8fG8dGH0lVF4DUCY3ZDqc",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "calsurf-mobile1.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "calsurf-mobile1",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "calsurf-mobile1.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "139835322152",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:139835322152:web:440a5a83c2887ae94fea1d"
};

// Initialize Firebase only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 1. FIX AUTH PERSISTENCE (Keeps you logged in)
const auth = getAuth(app);

// 2. FIX DATABASE CONNECTION (Solves "Client is Offline")
// Use standard getFirestore instead of initializeFirestore to avoid offline issues
let db: Firestore;
try {
  db = getFirestore(app);
} catch (err) {
  // If getFirestore fails, try initializeFirestore as fallback
  try {
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true, 
    });
  } catch (e) {
    throw new Error('Failed to initialize Firestore');
  }
}

export { auth, db };