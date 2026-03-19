import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

let app: admin.app.App | undefined;

if (!admin.apps.length) {
  try {
    // Verificamos si existe la variable de entorno en Base64
    if (process.env.FIREBASE_ADMIN_KEY_B64) {
      // Decodificamos el Base64 a un string JSON y lo parseamos
      const serviceAccountJson = Buffer.from(process.env.FIREBASE_ADMIN_KEY_B64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(serviceAccountJson);

      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin inicializado correctamente con credenciales B64.');
      
    } else {
      // Fallback a las credenciales por defecto (útil para cuando lo subas a producción en Vercel/GCP)
      app = admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PRIVATE_FIREBASE_PROJECT_ID || 'akistappve'
      });
      console.log('Firebase Admin inicializado con Application Default Credentials y projectId.');
    }
  } catch (error) {
    console.error('Error al inicializar Firebase Admin:', error);
  }
} else {
  // En Next.js (entorno de desarrollo), el código se recarga, así que reutilizamos la app si ya existe
  app = admin.app();
}

const adminAuth = app ? getAuth(app) : null;
const adminDb = app ? getFirestore(app) : null;
const adminMessaging = app ? getMessaging(app) : null;

export { adminAuth, adminDb, adminMessaging };