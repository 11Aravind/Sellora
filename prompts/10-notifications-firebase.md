# 10. Notifications with Firebase Cloud Messaging

**Goal:** vendors get a push notification for new orders and billing/limit alerts, plus an in-app notification list.

## Do this first
Firebase console -> create project -> Project settings:
- Add a Web app -> copy config values into the `NEXT_PUBLIC_FIREBASE_*` variables.
- Cloud Messaging -> Web Push certificates -> generate key pair -> `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
- Service accounts -> generate new private key -> fill `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

## Prompt

```
Read docs/CONTEXT.md. Use the CURRENT Firebase docs for web FCM (modular SDK v9+ API) and firebase-admin messaging.

PART A: database (new migration supabase/migrations/20261103000000_notifications.sql; do not edit older ones)
Table `notifications`: id uuid pk, tenant_id uuid null references tenants on delete cascade, user_id uuid not null
references auth.users on delete cascade, type text not null, title text not null, body text, link text,
read_at timestamptz, created_at timestamptz default now(). Index (user_id, created_at desc).
RLS: a user can select and update (read_at only, via a column grant) their own rows; inserts only via service role.
Regenerate types.

PART B: client
1. src/lib/firebase/client.ts (browser only, lazy init) and public/firebase-messaging-sw.js (service worker that
   shows background notifications; initialise it with the public config; link click focuses/open the URL in `data.link`).
2. <EnableNotifications/> component in the dashboard header: the permission prompt is shown ONLY after the user clicks
   it (never on page load). It registers the SW, gets the token (VAPID key), and calls a Server Action that upserts into
   notification_tokens (user_id = current user, tenant_id = current tenant, token, platform 'web', last_seen_at).
   Handle denied/unsupported browsers gracefully. Foreground messages show a sonner toast.
3. Notification bell with unread count + dropdown list reading `notifications`; mark as read / mark all read.

PART C: server
4. src/lib/firebase/admin.ts (server-only) initialised from env (replace \n in the private key).
5. src/features/notifications/send.ts: `notifyTenant({ tenantId, roles, type, title, body, link })`:
   - find members with those roles, insert one `notifications` row per user (service role),
   - fetch their tokens for that tenant, send via sendEachForMulticast (batches of 500),
   - delete tokens that return registration-token-not-registered / invalid-argument,
   - never throw into the caller (log and continue).
6. Triggers:
   - New order: after a successful place_order in the storefront action call notifyTenant(owner, admin, staff,
     'order.new', "New order ORD-000123", "₹1,250 from Bob", link to the dashboard order page on the ROOT domain).
     Use Next's `after()` (or equivalent) so checkout response is not delayed.
   - Cron route /api/cron/billing-reminders (Bearer CRON_SECRET): trial ends in 3 days and 1 day; payment past_due;
     product usage reached 80% and 100% of max_products (de-duplicate: don't send the same type to the same tenant
     more than once per 24 hours; keep a small `notifications` lookup by type+created_at).
   - Razorpay webhook: payment failed -> notifyTenant(owner, 'billing.failed').
7. Token hygiene: on logout delete this device's token row.

Run lint, typecheck, build. Document setup in docs/NOTIFICATIONS.md.
```

## Manual check
- [ ] Click "Enable notifications" -> permission prompt -> a row in `notification_tokens`
- [ ] Place an order on the storefront -> a push arrives (tab in background) and a bell item appears
- [ ] Revoking permission in the browser -> no errors in the server log on the next send
- [ ] Running the billing cron twice in a row does not create duplicate reminders
