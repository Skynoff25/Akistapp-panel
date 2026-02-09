/**
 * NOTE: The Firebase Admin SDK has been temporarily disabled.
 * 
 * The Admin SDK requires server-side authentication with Google Cloud, which
 * cannot be configured from within this editor environment. Attempting to use it
 * was causing an authentication error ("failed to fetch a valid Google OAuth2 access token").
 * 
 * To allow development to continue, server actions that depended on this file
 * have been switched to a "simulation" mode.
 * 
 * For a full production deployment, the environment running this code (e.g., a serverless
 * function or VM) would need to have Application Default Credentials (ADC) configured
 * with the correct IAM permissions for your Firebase project. See /docs/backend.md for details.
 */

// import * as admin from 'firebase-admin';
// import { getAuth } from 'firebase-admin/auth';
// import { getFirestore } from 'firebase-admin/firestore';
// import { getMessaging } from 'firebase-admin/messaging';

// let app;

// if (!admin.apps.length) {
//   try {
//     app = admin.initializeApp({
//       // The credential is automatically discovered by the Admin SDK
//       // in a properly configured server environment (like Cloud Run or Cloud Functions).
//     });
//   } catch (error) {
//     console.error('Firebase admin initialization error. See /docs/backend.md for more info.', error);
//   }
// }

// const adminAuth = app ? getAuth(app) : null;
// const adminDb = app ? getFirestore(app) : null;
// const adminMessaging = app ? getMessaging(app) : null;

// export { adminAuth, adminDb, adminMessaging };
