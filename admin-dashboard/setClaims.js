/**
 * ✅ Script Node.js pour attribuer le rôle 'admin'
 * Lancer : node setClaims.js
 */

const admin = require('firebase-admin');

// ✅ NOM EXACT de ton JSON :
const serviceAccount = require('./botaik-app-firebase-adminsdk-fbsvc-deff27d894.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ✅ Ton UID correct : Remplace par ton UID Firebase
const uid = 'TON_UID_FIREBASE';

admin
  .auth()
  .setCustomUserClaims(uid, { role: 'admin' })
  .then(() => {
    console.log(`✅ Rôle 'admin' ajouté à l'utilisateur ${uid}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur :', error);
    process.exit(1);
  });
