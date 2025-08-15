// Script de correction Firestore pour prospects managers
// Usage: node fixManagerProspects.js
// Nécessite: npm install firebase-admin

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Chemin à adapter si besoin

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const MANAGER_EMAIL = 'clement.payet@botaik.com'; // À adapter si besoin

async function fixManagerProspects() {
  const clientsRef = db.collection('clients');
  const snapshot = await clientsRef.where('emailCommercial', '==', MANAGER_EMAIL).get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.emailManager) {
      await doc.ref.update({
        emailManager: MANAGER_EMAIL,
        emailCommercial: admin.firestore.FieldValue.delete(), // Supprime le champ
      });
      count++;
      console.log(`Corrigé: ${doc.id}`);
    }
  }
  console.log(`Terminé. ${count} prospects corrigés.`);
}

fixManagerProspects().catch(console.error);
