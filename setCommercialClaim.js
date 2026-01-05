const admin = require('firebase-admin');
const serviceAccount = require('./botaik-app-firebase-adminsdk-fbsvc-0f60baa462.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// Récupère les emails passés en argument, sinon utilise la liste par défaut
const emails = process.argv.slice(2);
const defaultEmails = [
  'clement.viart@botaik.com',
  'corentin.chaneyin@botaik.com',
  'eric.nadiama@botaik.com',
  'fabien.dirollo@botaik.com',
  'simon.menard@botaik.com',
  'contact@botaik.com'
];

async function setClaimsForAll() {
  const toProcess = emails.length > 0 ? emails : defaultEmails;
  for (const email of toProcess) {
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
