import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // O Firebase Admin aceita a chave com ou sem o replace se estiver formatada corretamente
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    } );
    console.log("Firebase inicializado!");
  } catch (error) {
    console.error("Erro na inicialização do Firebase:", error.message);
  }
}

const db = admin.firestore();
const auth = admin.auth();

export { admin, db, auth };
