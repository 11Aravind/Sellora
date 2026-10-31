# Tenant Routing & Domain Architecture

This document describes how URL routing, multi-tenancy subdomains, custom domains, and authentication cookie isolation work in SaaS Commerce Kit.

---

## 1. Overview

Each tenant (store) on the platform receives a dedicated subdomain:
```
https://{slug}.yourdomain.com
```
Vendors on plans that permit custom domains can also map their own domain (e.g. `https://shop.vendor.com`).

The main root domain (`https://yourdomain.com` or `http://localhost:3000`) hosts:
- Marketing landing pages (`/`, `/pricing`)
- Authentication (`/login`, `/signup`, `/forgot-password`, `/reset-password`)
- Vendor Onboarding (`/onboarding`)
- Vendor Management Dashboard (`/dashboard`, `/dashboard/[tenant]/*`)
- Super Admin Panel (`/super-admin/*`)

---

## 2. Host Resolution (`src/lib/tenancy/host.ts`)

Host headers (`x-forwarded-host` or `host`) are parsed by `parseHost(hostHeader, rootDomain)`:

1. **Port Stripping**: Ports are stripped for comparison (e.g., `shop-a.localhost:3000` is compared as `shop-a.localhost`).
2. **Case Insensitivity**: All domain headers are converted to lowercase.
3. **Reserved Subdomains**:
   The following 16 subdomains are reserved and always treated as the **root domain**:
   `www`, `app`, `admin`, `api`, `dashboard`, `super-admin`, `static`, `assets`, `mail`, `support`, `help`, `blog`, `docs`, `status`, `login`, `signup`.
4. **Classification**:
   - `{ kind: "root" }`: Root host or reserved subdomains.
   - `{ kind: "subdomain", slug }`: Valid tenant subdomain (e.g., `shop-a.yourdomain.com` or `shop-a.localhost:3000`).
   - `{ kind: "custom", domain }`: External custom domains pointing to the application.

---

## 3. Middleware Behaviour (`src/proxy.ts`)

### Root Host
- Serves regular Next.js routes (`/`, `/dashboard`, `/onboarding`, `/super-admin`, etc.).
- **Production Canonicalization**: In production (`NODE_ENV === "production"`), requests to `/stores/{slug}/*` are redirected (HTTP 301) to `https://{slug}.{rootDomain}/*` so each store has a single canonical URL. In development, `/stores/{slug}` remains directly accessible for convenience.

### Tenant Host (Subdomain & Custom Domain)
- **Dashboard / Admin Guard**: Any request to `/dashboard` or `/super-admin` on a tenant host is immediately redirected to the same path on the root domain (`https://{rootDomain}/dashboard`).
- **System Paths Bypass**: Requests to `/_next`, `/api/webhooks`, `/auth/callback`, and `/api/health` are never rewritten.
- **Rewriting**:
  - Subdomain hosts rewrite all storefront paths (`/`, `/products`, etc.) to `/stores/{slug}/*`.
  - Custom domain hosts resolve the slug using Supabase RPC `storefront_tenant(p_domain)` (cached in-memory for 60 seconds). If unknown, a 404 page is rendered. If valid, the path is rewritten to `/stores/{slug}/*`.
- **Session Continuity**: Cookies from the Supabase session refresher are passed along through redirects and rewrites.

---

## 4. Auth & Cookie Isolation

Auth cookies in `@supabase/ssr` default to the current host (`Host-only` cookie scope):
- **Vendor & Admin Auth**: Logins on the root host (`localhost:3000` or `yourdomain.com`) set cookies for the root host.
- **Customer Auth**: Customers browsing an individual store (`shop-a.yourdomain.com`) sign in with cookies scoped to that store's host.
- **Callback Route**: `/auth/callback` is preserved on all hosts without path rewrites, ensuring OAuth and email confirmations establish the session on the exact host that initiated auth.

---

## 5. Local Testing

### Option A: `*.localhost` (Recommended)
Modern browsers (Chrome, Edge, Firefox, Brave) treat `*.localhost` as loopback hostnames pointing directly to `127.0.0.1` without needing `/etc/hosts` modifications.

1. Ensure the dev server is running on port 3000:
   ```bash
   pnpm dev
   ```
2. Test root marketing / dashboard:
   - Root: `http://localhost:3000`
   - Dashboard: `http://localhost:3000/dashboard`
3. Test tenant subdomains:
   - `http://shop-a.localhost:3000` -> Resolves to `/stores/shop-a` (shows store name or under construction).
   - `http://nope.localhost:3000` -> Returns 404 if tenant does not exist.
   - `http://shop-a.localhost:3000/dashboard` -> Automatically redirects to `http://localhost:3000/dashboard`.

### Option B: `lvh.me` Wildcard Fallback
If your local browser or environment has issues with `*.localhost` subdomains, `lvh.me` is a public DNS record configured so `*.lvh.me` resolves to `127.0.0.1`:
- Subdomain: `http://shop-a.lvh.me:3000`
- Handled automatically by `parseHost()`.

---

## 6. Store Availability State (`is_open`)

In `src/app/stores/[slug]/layout.tsx`:
- Before rendering product catalog or children, the layout verifies `tenant.is_open`.
- If `is_open === false` (e.g. store is paused, subscription expired, or trial period elapsed), a friendly **"This store is temporarily unavailable"** card is rendered without exposing catalog or product data.
