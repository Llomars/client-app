const admin = require('firebase-admin');
const serviceAccount = require('./botaik-app-firebase-adminsdk-fbsvc-0f60baa462.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const commercialEmail = 'corentin.chaneyin@botaik.com';
const managerEmail = 'clement.payet@botaik.com';

const db = admin.firestore();

async function fixClients() {
  const clientsRef = db.collection('clients');
  const snapshot = await clientsRef.where('emailCommercial', '==', commercialEmail).get();
  if (snapshot.empty) {
    console.log('Aucun client à corriger.');
    return;
  }
  let count = 0;
  for (const doc of snapshot.docs) {
    await doc.ref.update({ emailManager: managerEmail });
    console.log(`Client ${doc.id} corrigé.`);
    count++;
  }
  console.log(`Correction terminée. ${count} client(s) mis à jour.`);
}

fixClients().catch(console.error);
