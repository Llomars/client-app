const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'vtNEKpMjpKhkQC4BgC0Y6phqFym2';

admin.auth().getUser(uid)
  .then(userRecord => {
    console.log('Custom claims:', userRecord.customClaims);
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur:', error);
    process.exit(1);
  });
