// Correction des fiches clients avec le SDK Admin Firebase
// Place ton fichier de clé de service dans client-app/Newkey.json

const admin = require('firebase-admin');
// Chemin correct pour la clé de service (placée dans client-app/Newkey.json)
const serviceAccount = require('../Newkey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // databaseURL n'est pas nécessaire pour Firestore
});

const db = admin.firestore();

async function syncAccoEmailAdmin() {
  const clientsSnap = await db.collection('clients').get();
  let count = 0;
  clientsSnap.forEach(async (clientDoc) => {
    const data = clientDoc.data();
    if (data.accoUserId && data.accoUserId !== data.emailCommercialAcco) {
      await db.collection('clients').doc(clientDoc.id).update({
        emailCommercialAcco: data.accoUserId,
      });
      console.log(`Client ${clientDoc.id} corrigé: emailCommercialAcco = ${data.accoUserId}`);
      count++;
    }
  });
  console.log(`Correction terminée. ${count} clients mis à jour.`);
}

syncAccoEmailAdmin().catch(console.error);
