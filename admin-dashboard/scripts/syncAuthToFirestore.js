// Script Node.js pour synchroniser tous les utilisateurs Firebase Auth vers Firestore
// Usage : node scripts/syncAuthToFirestore.js

const admin = require('firebase-admin');
const serviceAccount = require('../botaik-app-firebase-adminsdk-fbsvc-deff27d894.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function syncAllUsers() {
  try {
    let nextPageToken;
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      for (const user of listUsersResult.users) {
        const { uid, email, customClaims } = user;
        await db.collection('users').doc(uid).set({
          email: email || '',
          role: customClaims?.role || 'Non défini',
        }, { merge: true });
        console.log(`✅ Sync: ${email} (${uid})`);
      }
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    console.log('✅ Synchronisation terminée !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur de synchronisation :', err);
    process.exit(1);
  }
}

syncAllUsers();
