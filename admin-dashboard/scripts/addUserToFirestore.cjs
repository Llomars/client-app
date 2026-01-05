const admin = require('firebase-admin');

// Remplace le chemin par ton vrai fichier de clé service account
const serviceAccount = require('./botaik-app-firebase-adminsdk-fbsvc-0f60baa462.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const email = 'imran.esther@botaik.com';
const role = 'commercial';
const managerEmail = 'nolan.demars@botaik.re';

async function addUserToFirestore() {
  try {
    // Cherche l'utilisateur dans Auth pour récupérer son UID
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;
    // Ajoute ou met à jour le doc Firestore
    await db.collection('users').doc(uid).set({
      email,
      role,
      managerEmail
    }, { merge: true });
    console.log('✅ Utilisateur ajouté/synchronisé dans Firestore !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  }
}

addUserToFirestore();
