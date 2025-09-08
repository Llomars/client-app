const admin = require('firebase-admin');
const serviceAccount = require('./botaik-app-firebase-adminsdk-fbsvc-0f60baa462.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const commercialEmail = 'corentin.chaneyin@botaik.com';

const db = admin.firestore();

async function fixCommercialClients() {
  const clientsRef = db.collection('clients');
  const snapshot = await clientsRef.get();
  if (snapshot.empty) {
    console.log('Aucun client trouvé.');
    return;
  }
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.emailCommercial !== commercialEmail) {
      await doc.ref.update({ emailCommercial: commercialEmail });
      console.log(`Client ${doc.id} corrigé.`);
      count++;
    }
  }
  console.log(`Correction terminée. ${count} client(s) mis à jour.`);
}

fixCommercialClients().catch(console.error);
