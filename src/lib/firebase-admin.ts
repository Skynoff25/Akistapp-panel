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
 * with the correct IAM permissions for your Firebase project.
 */

// import * as admin from 'firebase-admin';

// if (!admin.apps.length) {
//   try {
//     admin.initializeApp({
//       credential: admin.credential.applicationDefault(),
//     });
//   } catch (error) {
//     console.error('Firebase admin initialization error', error);
//   }
// }

// export const adminAuth = admin.auth();
// export const adminDb = admin.firestore();
// export const adminMessaging = admin.messaging();
