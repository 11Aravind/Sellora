import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
  type MessagePayload,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

/**
 * Initializes and returns the Firebase client app instance lazily.
 */
export function getFirebaseClientApp(): FirebaseApp | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn("[Firebase Client] Missing NEXT_PUBLIC_FIREBASE_API_KEY or PROJECT_ID configuration.");
    return null;
  }

  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  return app;
}

/**
 * Checks if FCM is supported in the current client browser environment.
 */
export async function isFCMSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

/**
 * Initializes Firebase Messaging lazily.
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  const supported = await isFCMSupported();
  if (!supported) {
    return null;
  }

  const clientApp = getFirebaseClientApp();
  if (!clientApp) {
    return null;
  }

  if (!messagingInstance) {
    messagingInstance = getMessaging(clientApp);
  }

  return messagingInstance;
}

/**
 * Requests an FCM token for the registered Service Worker.
 */
export async function getFCMToken(
  swRegistration?: ServiceWorkerRegistration
): Promise<string | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return null;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("[Firebase Client] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not defined.");
  }

  try {
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });
    return token || null;
  } catch (err) {
    console.error("[Firebase Client] Failed to obtain FCM token:", err);
    return null;
  }
}

/**
 * Subscribes to foreground push notifications and executes a callback.
 * Returns an unregister function.
 */
export function onForegroundMessage(
  callback: (payload: MessagePayload) => void
): () => void {
  let unsubscribe: (() => void) | null = null;

  getFirebaseMessaging().then((messaging) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, (payload) => {
        callback(payload);
      });
    }
  });

  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}

