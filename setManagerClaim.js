const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = process.argv[2]; // UID passé en argument
if (!uid) {
  console.error('Usage: node setManagerClaim.js <UID>');
  process.exit(1);
}

admin.auth().setCustomUserClaims(uid, { role: 'manager' })
  .then(() => {
    console.log('Rôle manager attribué à l\'utilisateur', uid);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Erreur lors de l\'attribution du rôle:', err);
    process.exit(1);
  });
