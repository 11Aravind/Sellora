# Project Context (paste this into Antigravity before the first prompt)

## Product
A multi-tenant SaaS e-commerce platform. Vendors sign up, choose a subscription plan
(monthly/yearly, optional free trial), and receive their own store at `{slug}.rootdomain.com`
(or a custom domain on plans that allow it). Customers buy from those stores.
A Super Admin manages plans and the limits inside each plan (e.g. Starter = max 30 products).

## Stack (do not substitute)
- Next.js App Router, TypeScript (strict), Tailwind, shadcn/ui, React Hook Form, Zod
- Supabase: Postgres, Auth, Storage. Access control via Row Level Security
- Firebase Cloud Messaging for push notifications
- Razorpay Subscriptions for platform billing (INR)
- pnpm

## Source of truth
- Database schema: `supabase/migrations/20261101000000_init.sql`. Read it before writing any
  data code. Do **not** change tables from the app. If the schema must change, add a NEW
  migration file in `supabase/migrations/` (timestamp-prefixed) and regenerate types.
- Reference only (do not port): https://github.com/bagisto/bagisto (Laravel). Use it to understand
  features; implement in our stack.

## Architecture rules
1. Multi-tenancy = shared DB, `tenant_id` on every tenant table, RLS enforces access.
2. Plan limits are enforced by DB triggers. The UI only *displays* usage and translates errors.
   DB error messages start with a code: `PLAN_LIMIT_PRODUCTS`, `PLAN_LIMIT_STAFF`,
   `PLAN_LIMIT_ORDERS`, `PLAN_LIMIT_DOMAIN`, `SUBSCRIPTION_INACTIVE`, `AUTH_REQUIRED`, `FORBIDDEN`,
   `OUT_OF_STOCK`, `PRODUCT_UNAVAILABLE`, `RESERVED_SLUG`, `INVALID_SLUG`. Map them in `src/lib/errors.ts`.
3. Writes happen in Server Actions (`src/features/<domain>/actions.ts`) validated with Zod.
4. Reads happen in Server Components via `src/features/<domain>/queries.ts`.
5. Service-role client (`src/lib/supabase/admin.ts`) is server-only, used ONLY in webhooks,
   super-admin actions and cron routes. Add `import 'server-only'` to it.
6. Use RPCs exactly as defined: `create_tenant`, `place_order`, `tenant_usage`,
   `storefront_tenant`, `admin_set_tenant_status`. Never insert into `tenants`, `subscriptions`,
   `orders` or `order_items` directly from the client.
7. Money: DB stores product prices as `numeric(12,2)` rupees and plan prices as integer paise.
   Format with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
8. Route map: `/` `/pricing` `(auth)` `/onboarding` `/dashboard/[tenant]/*` `/super-admin/*`
   `/stores/[slug]/*` (subdomain traffic is rewritten here by middleware) `/api/webhooks/razorpay`.
9. Feature folders: `src/features/{auth,tenants,plans,subscriptions,catalog,orders,storefront,notifications}`
   each with `components/`, `actions.ts`, `queries.ts`, `schemas.ts`, `types.ts`.

## Working agreement
- Small, reviewable steps. After each prompt: run `pnpm lint && pnpm typecheck`, fix errors, then
  summarise what changed and what to test manually.
- No placeholder/mock data in finished screens: wire to Supabase.
- Accessible, responsive (mobile first) UI. Loading, empty and error states on every list/form.
- Never log secrets. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `RAZORPAY_KEY_SECRET` to the client.
- Ask me before adding any dependency not listed in the stack above.
