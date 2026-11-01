import "server-only";
import admin from "firebase-admin";

let adminApp: admin.app.App | null = null;

/**
 * Initializes and returns the Firebase Admin SDK singleton.
 * Returns null if required credentials are not set in the environment.
 */
export function getFirebaseAdminApp(): admin.app.App | null {
  if (adminApp) {
    return adminApp;
  }

  if (admin.apps.length > 0) {
    adminApp = admin.app();
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[Firebase Admin] Credentials not configured (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Push notifications will be skipped."
    );
    return null;
  }

  // Handle escaped \n newlines in private key string
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");

  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return adminApp;
  } catch (err) {
    console.error("[Firebase Admin] Initialization failed:", err);
    return null;
  }
}

/**
 * Returns the Firebase Admin Messaging service, or null if unconfigured.
 */
export function getFirebaseAdminMessaging(): admin.messaging.Messaging | null {
  const app = getFirebaseAdminApp();
  if (!app) {
    return null;
  }
  return admin.messaging(app);
}

