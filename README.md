# SaaS Commerce Platform

A multi-tenant "create your own online store" platform, in the spirit of Shopify.
Vendors sign up, pick a subscription plan (monthly or yearly, with an optional free trial),
get their own store link, and start selling. A **Super Admin** creates and edits the plans
and the limits inside each plan (for example: *Starter = max 30 products*).

Built with **Next.js (React)** + **Supabase** + **Firebase (notifications)**.
Domain model and feature set are inspired by [Bagisto](https://github.com/bagisto/bagisto) (MIT).

---

## 1. Read this first: "converting" Bagisto

Bagisto is a **Laravel / PHP** application. PHP code cannot be copied into a Next.js project.
So "convert" here means **re-implement**: we keep Bagisto's *ideas* (catalog, orders, tenants,
admin vs storefront) and rebuild them in TypeScript on Supabase.

| Bagisto (Laravel) | This project |
|---|---|
| Eloquent models + MySQL migrations | PostgreSQL tables in `supabase/migrations/` |
| Laravel auth + ACL roles | Supabase Auth + `tenant_members.role` + `platform_admins` + Row Level Security |
| Blade/Vue admin panel | Next.js `/dashboard/[tenant]` (vendor) and `/super-admin` |
| Blade/Vue storefront theme | Next.js `/stores/[slug]` served on `{slug}.yourdomain.com` |
| Multi-Tenant module (paid add-on) | `tenants` + `tenant_id` on every table + RLS + subdomain middleware |
| SaaS Subscription module (paid add-on) | `plans`, `subscriptions`, DB-enforced limits, Razorpay billing |
| Laravel queues / mail / events | Supabase Edge Functions / Next.js route handlers / Firebase FCM |
| Product images in `storage/` | Supabase Storage bucket `product-images` |

Use the Bagisto repo as a **reference** (read its `packages/Webkul/*` folders when you want to
see how it models something like attributes, carts, coupons, shipping). Do not try to port files.

---

## 2. Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Forms / validation | React Hook Form + Zod |
| Data fetching | Server Components + Server Actions; TanStack Query only where needed on the client |
| Backend / DB / Auth / Files | Supabase (Postgres, Auth, Storage, RLS) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Subscription billing | Razorpay Subscriptions (INR, UPI, cards); Stripe is a drop-in alternative |
| Hosting | Vercel (wildcard domain) + Supabase Cloud |

---

## 3. Architecture

```
                    yourdomain.com                 shop-a.yourdomain.com / customdomain.com
                          |                                        |
                 +--------v----------------------------------------v--------+
                 |            Next.js middleware (tenant resolver)           |
                 |  host -> slug/custom domain -> rewrite to /stores/[slug]  |
                 +--------+---------------+------------------+---------------+
                          |               |                  |
                 (marketing)/(auth)   /dashboard/[tenant]   /stores/[slug]
                 /super-admin         vendor admin          customer storefront
                          |               |                  |
                          +-------+-------+------------------+
                                  |   Supabase (anon/user JWT, RLS on every table)
                         +--------v---------+        +----------------+
                         | Postgres + RLS   |        | Storage        |
                         | triggers = limits|        | product-images |
                         +--------+---------+        +----------------+
                                  ^
        Razorpay webhook ---------+ (service role, server only)        Firebase FCM <- route handlers
```

### Multi-tenancy model
- **One shared database.** Every tenant-owned table has `tenant_id`.
- **RLS decides access**, not application code: a vendor can only see rows where they are a
  member of that `tenant_id`; the public can only see *active* products of *open* stores.
- Composite foreign keys (`(category_id, tenant_id)`) make cross-tenant references impossible.
- Store URLs: `slug.yourdomain.com` by default, plus an optional custom domain on plans that allow it.

### Plans and limits
- Super admin creates plans (`plans` table): price, interval (`month`/`year`), trial days and limits.
- Limits live in the **database** as triggers, so they cannot be bypassed from the browser:

| Limit | Enforced by | Error code raised |
|---|---|---|
| `max_products` | trigger on `products` | `PLAN_LIMIT_PRODUCTS` |
| `max_staff` | trigger on `tenant_members` | `PLAN_LIMIT_STAFF` |
| `max_orders_per_month` | `place_order()` RPC | `PLAN_LIMIT_ORDERS` |
| `custom_domain_allowed` | trigger on `tenants` | `PLAN_LIMIT_DOMAIN` |
| no valid subscription | all of the above | `SUBSCRIPTION_INACTIVE` |

- `NULL` in a limit column means unlimited.
- Expired trial / unpaid store: dashboard writes are blocked and the public storefront is hidden.
  Data is never deleted.

### Roles
| Role | Where | Can do |
|---|---|---|
| Super admin | row in `platform_admins` | manage plans, view/suspend all stores, view all subscriptions |
| Owner | `tenant_members.role = 'owner'` | everything in their store incl. billing |
| Admin | `'admin'` | catalog, orders, staff |
| Staff | `'staff'` | catalog, orders |
| Customer | any signed-in user placing an order | browse, order, see own orders |

---

## 4. Folder structure

```
saas-commerce/
├── README.md
├── .env.example
├── docs/
│   └── CONTEXT.md                  # project brief: paste into Antigravity first
├── prompts/                        # step-by-step build prompts (run in order)
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 20261101000000_init.sql # full schema, RLS, limits, RPCs, storage
│   ├── seed.sql                    # example plans
│   └── tests/
│       └── rls_and_limits.test.sql
├── public/
│   └── firebase-messaging-sw.js
└── src/
    ├── app/
    │   ├── (marketing)/            # landing, pricing
    │   ├── (auth)/                 # login, signup, forgot-password
    │   ├── onboarding/             # choose plan -> name store -> pick slug
    │   ├── dashboard/[tenant]/     # vendor admin
    │   │   ├── products/  categories/  orders/  team/  billing/  settings/
    │   ├── super-admin/            # plans, tenants, subscriptions
    │   ├── stores/[slug]/          # storefront (subdomain is rewritten here)
    │   │   ├── products/[productSlug]/  cart/  checkout/  orders/
    │   └── api/
    │       ├── webhooks/razorpay/route.ts
    │       └── notifications/send/route.ts
    ├── features/                   # one folder per business domain
    │   ├── auth/  tenants/  plans/  subscriptions/
    │   ├── catalog/  orders/  storefront/  notifications/
    │   │   └── (each: components/ · actions.ts · queries.ts · schemas.ts · types.ts)
    ├── components/
    │   ├── ui/                     # shadcn
    │   └── shared/                 # layout shells, empty states, usage meter
    ├── lib/
    │   ├── supabase/               # client.ts · server.ts · admin.ts · middleware.ts
    │   ├── tenancy/                # host parsing, resolve tenant
    │   ├── billing/                # razorpay client + signature verify
    │   ├── firebase/               # client + admin
    │   ├── errors.ts               # maps DB error codes -> friendly messages
    │   └── utils.ts
    ├── types/database.ts           # generated by `supabase gen types`
    └── middleware.ts               # (or proxy.ts on Next.js 16+): session refresh + tenant routing
```

Rules for the codebase:
1. Pages are thin. They call `features/*/queries.ts` and render components.
2. All writes go through Server Actions in `features/*/actions.ts` and validate with Zod.
3. The service-role Supabase client (`lib/supabase/admin.ts`) is imported **only** by webhooks,
   the super-admin actions and cron endpoints, never by client components.
4. Never trust the client for prices, plan or tenant: the database re-checks everything.

---

## 5. Getting started

### Prerequisites
Node 20+, pnpm, Docker (for local Supabase), the [Supabase CLI](https://supabase.com/docs/guides/cli),
a Firebase project (Cloud Messaging) and a Razorpay account (test mode is fine).

### Steps
```bash
# 1. scaffold the app (or let Antigravity do it: see prompts/01)
pnpm create next-app@latest saas-commerce --ts --tailwind --app --src-dir --eslint --use-pnpm
cd saas-commerce

# 2. copy this kit's supabase/ folder, docs/, prompts/ and .env.example into the project

# 3. start local Supabase and apply the schema + seed plans
supabase init            # skip if supabase/config.toml already exists
supabase start
supabase db reset        # runs migrations/ then seed.sql

# 4. generate TypeScript types
supabase gen types typescript --local > src/types/database.ts

# 5. env
cp .env.example .env.local   # fill in values from `supabase status`

# 6. run
pnpm dev
```

### Create the first Super Admin
Sign up in the app, then run in the Supabase SQL editor (Studio at http://localhost:54323):
```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'you@example.com';
```

### Local subdomains
`shop-a.localhost:3000` works in Chrome and Firefox without any setup.
Safari may need `shop-a.lvh.me:3000` instead (set `NEXT_PUBLIC_ROOT_DOMAIN` accordingly).

### Verify the database
```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" -f supabase/tests/rls_and_limits.test.sql
# expect: NOTICE:  ALL TESTS PASSED
```

---

## 6. Build roadmap (follow `prompts/` in order)

| # | Prompt file | Result |
|---|---|---|
| 00 | `00-how-to-use.md` | How to feed these prompts to Antigravity |
| 01 | `01-scaffold.md` | Next.js project, folder structure, UI kit, lint |
| 02 | `02-supabase-setup.md` | Supabase clients, migration applied, generated types, session middleware |
| 03 | `03-auth-and-onboarding.md` | Signup/login, plan selection, create store |
| 04 | `04-tenant-routing.md` | Subdomain and custom-domain routing to the storefront |
| 05 | `05-super-admin.md` | Plan builder with limits, tenants list, suspend |
| 06 | `06-billing-razorpay.md` | Pricing page, checkout, webhooks, trials, upgrade/cancel |
| 07 | `07-vendor-catalog.md` | Categories, products, image upload, usage meter and limit UX |
| 08 | `08-storefront-and-checkout.md` | Customer storefront, cart, checkout via `place_order` |
| 09 | `09-orders-management.md` | Vendor order management, customer order history, restock on cancel |
| 10 | `10-notifications-firebase.md` | FCM push for new orders, trial ending, plan limits |
| 11 | `11-security-and-tests.md` | RLS tests, E2E tests, rate limiting, hardening |
| 12 | `12-deploy.md` | Vercel wildcard domain, Supabase prod, cron jobs |
| 13 | `13-bagisto-parity-backlog.md` | Later: variants, coupons, taxes, shipping, CMS, reviews |

---

## 7. Known gaps (decide before launch)

- **Payments for vendors' customers.** The schema defaults orders to cash-on-delivery.
  Online payment for customers needs per-vendor payment credentials (Razorpay Route / Stripe Connect
  or vendors' own keys). That is a separate design decision: see backlog.
- **Trial abuse.** One person can create several stores to get repeated trials. The migration caps
  5 stores per account; consider requiring a card or phone verification for trials.
- **Downgrades.** If a vendor downgrades below current usage, existing products stay, but new ones are
  blocked until they are under the limit.
- **Taxes / GST invoices** for the platform's own subscription fees are not included.
- **Custom domains** need DNS verification and SSL provisioning on your host (Vercel Domains API).
- `tenants.settings` is public (used by the storefront). Never store secrets in it.
