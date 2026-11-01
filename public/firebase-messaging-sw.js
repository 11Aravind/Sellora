// Firebase Cloud Messaging Service Worker
// Handles background notifications and notification clicks

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Initialize Firebase in the service worker from query parameters or defaults
try {
  const swUrl = new URL(location.href);
  const apiKey = swUrl.searchParams.get("apiKey");
  const projectId = swUrl.searchParams.get("projectId");
  const messagingSenderId = swUrl.searchParams.get("messagingSenderId");
  const appId = swUrl.searchParams.get("appId");

  if (apiKey && projectId) {
    firebase.initializeApp({
      apiKey,
      projectId,
      messagingSenderId,
      appId,
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || "New Notification";
      const options = {
        body: payload.notification?.body || payload.data?.body || "",
        icon: payload.notification?.icon || "/favicon.ico",
        badge: "/favicon.ico",
        data: {
          link: payload.data?.link || payload.notification?.click_action || "/",
        },
      };

      return self.registration.showNotification(title, options);
    });
  }
} catch (err) {
  console.warn("[firebase-messaging-sw] Failed to initialize Firebase:", err);
}

// Background push event listener fallback
self.addEventListener("push", (event) => {
  if (event.data) {
    try {
      const json = event.data.json();
      const title = json.notification?.title || json.data?.title;
      if (title) {
        const options = {
          body: json.notification?.body || json.data?.body || "",
          icon: json.notification?.icon || "/favicon.ico",
          data: {
            link: json.data?.link || json.notification?.click_action || "/",
          },
        };
        event.waitUntil(self.registration.showNotification(title, options));
      }
    } catch {
      // Payload was not JSON or handled by Firebase SDK directly
    }
  }
});

// Click listener: focus existing window or open data.link
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetLink = event.notification.data?.link || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus already open matching tab
        for (const client of windowClients) {
          if (client.url === targetLink && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetLink);
        }
      })
  );
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
