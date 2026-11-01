# Notifications with Firebase Cloud Messaging (FCM)

This document provides setup instructions, architectural details, and testing steps for the web push notification and in-app notification center implemented in Sellora.

---

## 1. Firebase Console Setup

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project (e.g., `sellora-commerce`).
3. Google Analytics can be disabled or enabled based on preference.

### Step 2: Register a Web Application
1. In Project Overview, click the **Web** icon (`</>`) to add a web application.
2. Enter an app nickname (e.g., `Sellora Web`).
3. Copy the configuration credentials into your `.env` or `.env.local`:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789012"
   NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789012:web:abcdef..."
   ```

### Step 3: Generate Web Push VAPID Key Pair
1. In Firebase Console, go to **Project settings** (gear icon) -> **Cloud Messaging** tab.
2. Under **Web configuration**, find **Web Push certificates**.
3. Click **Generate key pair**.
4. Copy the public key into your environment variables:
   ```bash
   NEXT_PUBLIC_FIREBASE_VAPID_KEY="BElx..."
   ```

### Step 4: Generate Firebase Admin Service Account Key
1. In Firebase Console, go to **Project settings** -> **Service accounts** tab.
2. Select **Firebase Admin SDK** (Node.js).
3. Click **Generate new private key** and confirm to download the JSON file.
4. Extract the following fields into your environment variables:
   ```bash
   FIREBASE_PROJECT_ID="your-project-id"
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@your-project-id.iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgI...\n-----END PRIVATE KEY-----\n"
   ```
   *Note: Ensure newline escapes `\n` are retained in the private key string.*

---

## 2. Architecture & Components

### Database
- **`public.notifications`**: In-app notifications table indexed by `(user_id, created_at desc)`.
  - RLS: Authenticated users can `SELECT` and `UPDATE` (`read_at` column only) their own notifications.
  - Inserts are strictly restricted to the service role.
- **`public.notification_tokens`**: Stores FCM device tokens per user/tenant with `platform = 'web'` and `last_seen_at`.

### Client Integration
- **`src/lib/firebase/client.ts`**: Modular Firebase v9+ client SDK lazily loaded in browser contexts only.
- **`public/firebase-messaging-sw.js`**: Background service worker that receives push notifications when tabs are closed/unfocused. Clicking a notification automatically focuses an existing store tab or opens the notification link.
- **`<EnableNotifications/>`**: Opt-in button located in the dashboard header. Permission is **only** requested after explicit user click. Once granted, it captures the device token, saves it via server action, and sets up real-time foreground `sonner` toasts.
- **`<NotificationBell/>`**: Bell icon in the dashboard header displaying unread notification count badge, dropdown notification history, single "Mark as read", and "Mark all read" capabilities.

### Server Dispatcher (`notifyTenant`)
- **`src/features/notifications/send.ts`**:
  - Finds tenant members matching targeted roles (`owner`, `admin`, `staff`).
  - Atomically creates in-app notification rows.
  - Queries active device tokens and sends Web Push via Firebase Admin `sendEachForMulticast` in chunks of 500.
  - Automatically prunes invalid or unregistered tokens (`messaging/registration-token-not-registered`).
  - Does not throw into caller functions.

### Triggers
1. **Storefront Checkout**: After customer places an order via `placeOrderAction`, a background task runs via `next/server` `after()` to notify vendor team members without delaying checkout response.
2. **Subscription Payment Failure**: When Razorpay webhook receives `payment.failed`, sends a high-priority alert to the store owner.
3. **Scheduled Billing Reminders**: `/api/cron/billing-reminders` runs on schedule (authenticated with `Bearer CRON_SECRET`):
   - Trial ending in 3 days (`trial.ending_soon_3d`).
   - Trial ending in 24 hours (`trial.ending_soon_1d`).
   - Subscription renewal past due (`billing.past_due`).
   - Product capacity reached 80% (`limit.products_80`) and 100% (`limit.products_100`).
   - De-duplicates so no tenant receives more than one reminder of the same type within 24 hours.
4. **Token Hygiene**: When a user logs out via `UserNav`, their device's token is cleanly removed from `notification_tokens`.

---

## 3. Manual Testing & Verification

1. **Enable Notifications**:
   - Sign into a vendor dashboard.
   - Click "Enable notifications" in the top right header.
   - Allow notifications in the browser prompt.
   - Verify that the button switches to "Push on" and a record appears in `notification_tokens`.

2. **Storefront Order Push**:
   - In a separate incognito window, browse the store and checkout with COD.
   - Verify a push notification appears on your desktop (or a Sonner toast if tab is in foreground) and the notification bell count increments.

3. **In-App Notification Center**:
   - Click the bell icon.
   - Verify unread notification appears with icon, title, amount, and timestamp.
   - Click "Mark all read" or individual "Read" buttons to verify unread badge clears.

4. **Billing Cron & De-duplication**:
   - Run: `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/billing-reminders`
   - Run the command a second time immediately.
   - Verify the second response shows 0 reminders sent due to the 24-hour de-duplication filter.

