// Script Node.js pour définir le rôle "manager" dans les custom claims Firebase Auth
// Usage : node scripts/setManagerClaim.js <email_du_manager>

const admin = require('firebase-admin');
const serviceAccount = require('../botaik-app-firebase-adminsdk-fbsvc-deff27d894.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function setManagerClaim(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: 'manager' });
    console.log(`✅ Claim 'manager' appliqué à ${email}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Usage : node scripts/setManagerClaim.js <email_du_manager>');
  process.exit(1);
}
setManagerClaim(email);
