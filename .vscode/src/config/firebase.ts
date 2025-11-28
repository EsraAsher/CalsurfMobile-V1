// src/config/firebase.ts
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
// This import ensures the storage library is available for Firebase to find automatically
import '@react-native-async-storage/async-storage';

// 👇 PASTE YOUR REAL KEYS HERE (From the New Project)
const firebaseConfig = {
  apiKey: "AIzaSyD3dyQ52nGtgJxwwHvyfDIN3PiE90v8XJY", 
  authDomain: "calsurfing.firebaseapp.com",
  projectId: "calsurfing",
  storageBucket: "calsurfing.firebasestorage.app",
  messagingSenderId: "9645458694",
  appId: "1:9645458694:web:..." 
};

// 1. Initialize App
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 2. Initialize Auth (Standard Method)
// We let Firebase auto-detect React Native storage
let auth: Auth;
try {
  auth = getAuth(app);
} catch (e) {
  auth = initializeAuth(app);
}

// 3. Initialize Firestore (With Offline Fix)
let db: Firestore;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true, 
  });
} catch (e) {
  db = getFirestore(app);
}

// 4. Storage
const storage: FirebaseStorage = getStorage(app);

export { auth, db, storage };