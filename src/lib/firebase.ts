import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Activar la persistencia de datos (Offline Resilience - Phase 1)
// Verifica si estamos del lado del cliente antes de invocar IndexedDB.
if (typeof window !== "undefined") {
    try {
        enableMultiTabIndexedDbPersistence(db).catch((err) => {
            if (err.code == 'failed-precondition') {
                console.warn('Persistencia múltiple falló: Múltiples pestañas abiertas no compartibles en navegadores antiguos.');
            } else if (err.code == 'unimplemented') {
                console.warn('Este navegador no soporta IndexedDB local persistente.');
            }
        });
    } catch (e) {
        console.warn("No se pudo inicializar la persistencia", e);
    }
}

const storage = getStorage(app);

const areFirebaseCredentialsSet = 
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId;


export { app, auth, db, storage, areFirebaseCredentialsSet };
