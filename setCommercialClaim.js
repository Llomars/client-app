const admin = require('firebase-admin');
const serviceAccount = require('./botaik-app-firebase-adminsdk-fbsvc-0f60baa462.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Liste des emails à traiter
const emails = [
  'clement.viart@botaik.com',
  'corentin.chaneyin@botaik.com',
  'eric.nadiama@botaik.com',
  'fabien.dirollo@botaik.com',
  'simon.menard@botaik.com',
  'contact@botaik.com'
];

async function setClaimsForAll() {
  for (const email of emails) {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'commercial' });
      console.log(`Rôle commercial attribué à l'utilisateur ${email}`);
    } catch (err) {
      console.error(`Erreur pour ${email}:`, err.message);
    }
  }
  process.exit(0);
}

setClaimsForAll();
