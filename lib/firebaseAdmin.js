import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    });
    console.log("✅ Firebase Admin inicializado");
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase Admin:", error.message);
  }
}

const db = admin.firestore();
const auth = admin.auth();

export { admin, db, auth };