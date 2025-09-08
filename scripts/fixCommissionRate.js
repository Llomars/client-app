// Script à lancer une seule fois : node scripts/fixCommissionRate.js
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

async function fixCommissionRate() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.commissionRate === undefined) {
      await usersRef.doc(doc.id).set({ commissionRate: 0.05 }, { merge: true });
      count++;
      console.log(`Mise à jour: ${data.email}`);
    }
  }
  console.log(`Utilisateurs mis à jour: ${count}`);
}

fixCommissionRate().then(() => process.exit());
