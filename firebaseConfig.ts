import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAYICMkhDfLsMT2cHUQj1kQJ_ZCk4bMC-E",
  authDomain: "botaik-app.firebaseapp.com",
  projectId: "botaik-app",
  storageBucket: "botaik-app.appspot.com",   // ✅ CORRECTED !!
  messagingSenderId: "704738687560",
  appId: "1:704738687560:web:4f90e58f5df0405b28b67d"
};

// ✅ Initialiser Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
