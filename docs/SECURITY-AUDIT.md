# Security Audit & Hardening Report

**Application:** SaaS Commerce Platform (Sellora)  
**Date:** November 2026  
**Auditor:** Automated Security Reviewer  
**Status:** Audit Complete — Hardening & Remediations Applied

---

## 1. Executive Summary

A comprehensive multi-layered security audit was performed on the SaaS Commerce Kit covering:
1. **Multi-Tenant Data Isolation & Service-Role Client Access**
2. **Client-Side Secret Exposure & Bundle Leakage**
3. **Server Actions Input Validation, Authentication, & Error Handling**
4. **File Upload Verification, MIME Types, & Storage RLS**
5. **Cross-Site Scripting (XSS) & User Input Escaping**
6. **Webhook Signature Verification & Idempotency**
7. **PostgreSQL Database Security, `SECURITY DEFINER` Functions, & Row Level Security (RLS)**

---

## 2. Service-Role Client Usage Audit (`lib/supabase/admin`)

The service-role client (`createAdminClient()`) bypasses Row Level Security and carries full database read/write access. Every usage in the application was inspected to confirm:
- It is enforced as server-only (`import 'server-only'`).
- It is preceded by an explicit authorization gate (`isPlatformAdmin`, verified tenant membership, HMAC signature, or `CRON_SECRET`).
- Database mutations and reads are strictly scoped to the tenant ID of the caller or target payload.

### Findings Table

| Location | Guard / Authorisation Gate | Tenant Scoping | Finding & Fix |
| :--- | :--- | :--- | :--- |
| `src/lib/supabase/admin.ts` | Factory function; enforces `import 'server-only'` and checks secret presence | N/A | **Pass** — Server-only boundary strictly enforced. |
| `src/app/api/webhooks/razorpay/route.ts` | HMAC-SHA256 signature verification via `verifyWebhookSignature` | Scoped to payload's `subscription.tenant_id` | **Pass** — Rejects unverified signatures with HTTP 400. |
| `src/app/api/cron/expire-subscriptions/route.ts` | `Bearer CRON_SECRET` authorization header | Global maintenance of trialing and incomplete subscriptions | **Pass** — Protected by shared secret; unauthenticated requests receive HTTP 401. |
| `src/app/api/cron/billing-reminders/route.ts` | `Bearer CRON_SECRET` authorization header | Scoped per tenant in iteration | **Pass** — Protected by shared secret; 24-hour de-duplication prevents notification flooding. |
| `src/app/dashboard/[tenant]/billing/page.tsx` | Authenticated user + `is_tenant_member(tenant.id, ['owner', 'admin'])` | Scoped to active `tenant.id` | **Pass** — Staff role cannot view billing; access scoped to tenant. |
| `src/features/auth/actions.ts` (`onboardingAction`) | Authenticated user session required (`supabase.auth.getUser()`) | Creates tenant and links caller as owner | **Pass** — Caller must be authenticated; slug uniqueness and validation checked. |
| `src/features/catalog/actions.ts` (`deleteProductAction`) | Authenticated user + `is_tenant_member(tenantId, ['owner', 'admin'])` | Cleans up storage files prefixed with `${tenantId}/${productId}` | **Pass** — Deletion scoped to caller's tenant; cannot delete another tenant's files. |
| `src/features/notifications/send.ts` (`notifyTenant`) | Server-only internal helper; called from authorized server contexts | Scoped to target `tenantId` members and device tokens | **Pass** — Enforces `import 'server-only'`; queries and token cleanup isolated by tenant. |
| `src/features/plans/queries.ts` | Super-admin functions check `isPlatformAdmin(userId)` | Scoped to platform subscription plans | **Pass** — Non-super-admins receive FORBIDDEN / empty responses. |
| `src/features/storefront/actions.ts` (`placeOrderAction`) | Authenticated customer session; Next.js `after()` background task | Scoped to confirmed `tenantId` and `orderId` | **Pass** — Asynchronous notification task only reads order details for the placed order. |
| `src/features/subscriptions/actions.ts` | Authenticated user + `is_tenant_member(tenantId, ['owner'])` | Scoped to `tenantId` | **Pass** — Non-owners cannot create or change subscriptions. |
| `src/features/tenants/actions.ts` | Authenticated user + `is_tenant_member(tenantId, ['owner'])` | Scoped to `tenantId` | **Pass** — Non-owners cannot update store branding, domains, or settings. |
| `src/features/tenants/queries.ts` | Authenticated user + tenant membership | Scoped to `tenantId` | **Pass** — Tenant overview stats isolated to requested tenant. |
| `src/lib/billing/razorpay.ts` | Internal plan synchronization | Global plan IDs | **Pass** — Only invoked by admin actions. |

---

## 3. Client Bundles & Environment Variables Audit

- **Check**: Grep `process.env` in all client components (marked `'use client'`) and client utilities.
- **Result**:
  - Only `NEXT_PUBLIC_*` variables are referenced in client bundles:
    - `NEXT_PUBLIC_APP_URL`
    - `NEXT_PUBLIC_ROOT_DOMAIN`
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
    - `NEXT_PUBLIC_FIREBASE_API_KEY`
    - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
    - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
    - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
    - `NEXT_PUBLIC_FIREBASE_APP_ID`
    - `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
  - High-privilege secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `FIREBASE_PRIVATE_KEY`, `CRON_SECRET`) are imported **strictly** in files marked `import 'server-only'` or server routes.
- **Severity**: Low / Pass.

---

## 4. Server Actions Audit

Every Server Action in `src/features/*/actions.ts`:
1. **Zod Validation**: Validates all incoming payloads using Zod schemas (`safeParse`). Rejects malformed or oversized inputs with descriptive validation errors.
2. **Authentication**: Resolves user identity via `supabase.auth.getUser()`. Never trusts client-submitted user IDs.
3. **Tenant Membership**: Validates that the caller is a member of the target store (`is_tenant_member` checking `owner`, `admin`, or `staff`).
4. **Error Masking**: Database constraint violations and plan limit errors are caught and sanitized via `parseDbError` and `friendlyMessage`. No raw SQL queries, stack traces, or PostgreSQL table schemas are leaked to clients.
- **Severity**: Low / Pass.

---

## 5. File Uploads & Storage Bucket Isolation

- **Storage Bucket**: `product-images` (public read, authenticated write).
- **Storage Row Level Security (RLS)** in `supabase/migrations/20261101000000_init.sql`:
  ```sql
  create policy "product images member insert" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'product-images'
      and public.is_tenant_member(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'staff'])
    );
  ```
  The first folder segment **must** be the caller's tenant UUID, and the caller must hold a valid role on that tenant.
- **MIME Allow-list**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- **Max File Size**: 5 MB per file.
- **File Deletion**: When products are deleted, `deleteProductAction` extracts the tenant-scoped object path and removes it via the admin storage client.
- **Severity**: Low / Pass.

---

## 6. Text Escaping & Cross-Site Scripting (XSS)

- **Audit**: Checked all occurrences of `dangerouslySetInnerHTML`.
  1. `src/app/dashboard/[tenant]/orders/[id]/print/page.tsx`: Injects static `@media print` CSS stylesheet rules (no user input).
  2. `src/app/stores/[slug]/layout.tsx`: Injects sanitized store primary color CSS variable (`--primary: ${primaryColor}`).
  3. `src/app/stores/[slug]/products/[productSlug]/page.tsx`: Generates JSON-LD schema markup serialized through `JSON.stringify()`.
- **User-Supplied Text**: Product descriptions, store names, customer shipping addresses, notes, and staff member names are rendered as standard React JSX children, which automatically escapes HTML entities (`<`, `>`, `&`, `"`, `'`).
- **Severity**: Low / Pass.

---

## 7. Webhooks Audit

- **Endpoint**: `/api/webhooks/razorpay/route.ts`
- **HMAC Signature**: Validates raw request body against `RAZORPAY_WEBHOOK_SECRET` using `crypto.createHmac('sha256', secret)`.
- **Unauthenticated**: No authentication cookies required. Rejects invalid signatures with HTTP 400.
- **Idempotency**: Payment records in `subscription_payments` are upserted with `onConflict: "razorpay_payment_id", ignoreDuplicates: true`.
- **Severity**: Low / Pass.

---

## 8. Database Security & Migrations Audit

- **`SECURITY DEFINER` Functions**:
  All `SECURITY DEFINER` functions across `20261101000000_init.sql`, `20261102000000_cancel_order.sql`, and `20261103000000_notifications.sql` explicitly specify:
  ```sql
  set search_path = public
  ```
  This prevents `search_path` manipulation attacks where an attacker creates malicious functions in a temporary or user-controlled schema.
- **Row Level Security**:
  All public tables have RLS enabled (`alter table ... enable row level security;`).
- **Public Execute Grants**:
  Administrative RPCs (`admin_set_tenant_status`) revoke execute from `public` and `anon`, allowing execution only by authenticated platform admins.
- **Severity**: Low / Pass.

---

## 9. Platform Hardening & Remediations Applied

### 9.1 HTTP Security Headers
Configured in [`next.config.ts`](file:///d:/Projects/saas-commerce-kit/next.config.ts):
- **Content-Security-Policy (CSP)**: Scoped for Razorpay Checkout (`https://checkout.razorpay.com`), Firebase Cloud Messaging (`https://fcm.googleapis.com`, `https://*.firebaseio.com`), Google Fonts, and Supabase WebSockets (`wss://*.supabase.co`).
- **Strict-Transport-Security (HSTS)**: `max-age=63072000; includeSubDomains; preload`.
- **X-Content-Type-Options**: `nosniff`.
- **Referrer-Policy**: `origin-when-cross-origin`.
- **X-Frame-Options**: `DENY`.
- **Permissions-Policy**: `camera=(), microphone=(), geolocation=()`.

### 9.2 Rate Limiting
- Implemented via a Postgres-backed sliding-window rate limiter (`rate_limit_buckets` table and `check_rate_limit` RPC):
  - **Auth (`/login`, `/signup`, `/forgot-password`)**: 5 attempts per IP / email per minute.
  - **Checkout (`place_order`)**: 10 order placements per customer per 10 minutes.
  - **Slug Availability & Store Enumeration**: 30 lookups per minute.

### 9.3 Recommended Supabase Dashboard Auth Settings
For production environments, ensure the following are enabled in the Supabase Dashboard (**Authentication** -> **Configuration**):
1. **Email Confirmations**: Enable **Confirm email** to verify customer and vendor emails before granting full active status.
2. **Password Security**:
   - Minimum password length: 8 characters.
   - Require lower, upper, digits, and special characters.
   - Enable **Check for leaked passwords** (HaveIBeenPwned).
3. **Rate Limits**:
   - Limit email rate to 30 emails / hour.
   - Token refresh limit: 30 / minute.

