// Script de correction des fiches clients pour synchroniser accoUserId -> emailCommercialAcco
// À lancer une fois dans l'environnement Node.js connecté à Firebase

const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
} = require("firebase/firestore");
const firebaseConfig = {
  apiKey: "AIzaSyAYICMkhDfLsMT2cHUQj1kQJ_ZCk4bMC-E",
  authDomain: "botaik-app.firebaseapp.com",
  projectId: "botaik-app",
  storageBucket: "botaik-app.appspot.com",
  messagingSenderId: "704738687560",
  appId: "1:704738687560:web:4f90e58f5df0405b28b67d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function syncAccoEmail() {
  const clientsSnap = await getDocs(collection(db, "clients"));
  let count = 0;
  for (const clientDoc of clientsSnap.docs) {
    const data = clientDoc.data();
    // Si accoUserId existe et emailCommercialAcco est absent ou différent
    if (data.accoUserId && data.accoUserId !== data.emailCommercialAcco) {
      await updateDoc(doc(db, "clients", clientDoc.id), {
        emailCommercialAcco: data.accoUserId,
      });
      console.log(
        `Client ${clientDoc.id} corrigé: emailCommercialAcco = ${data.accoUserId}`
      );
      count++;
    }
  }
  console.log(`Correction terminée. ${count} clients mis à jour.`);
}

syncAccoEmail().catch(console.error);
