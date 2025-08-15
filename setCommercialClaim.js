const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = process.argv[2]; // UID passé en argument
if (!uid) {
  console.error('Usage: node setCommercialClaim.js <UID>');
  process.exit(1);
}

admin.auth().setCustomUserClaims(uid, { role: 'commercial' })
  .then(() => {
    console.log('Rôle commercial attribué à l\'utilisateur', uid);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Erreur lors de l\'attribution du rôle:', err);
    process.exit(1);
  });
