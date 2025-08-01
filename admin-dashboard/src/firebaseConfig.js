// ✅ firebaseConfig.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ✅ Ta config Firebase (copie depuis ta console Firebase si besoin)
const firebaseConfig = {
  apiKey: 'AIzaSyAYICMkhDfLsMT2cHUQj1kQJ_ZCk4bMC-E',
  authDomain: 'botaik-app.firebaseapp.com',
  projectId: 'botaik-app',
  storageBucket: 'botaik-app.appspot.com',
  messagingSenderId: '704738687560',
  appId: '1:704738687560:web:4f90e58f5df0405b28b67d',
};

// ✅ Initialise ton app Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialise Firestore
export const db = getFirestore(app);

// ✅ Initialise Auth pour login/register
export const auth = getAuth(app);
