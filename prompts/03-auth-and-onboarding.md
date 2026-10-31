# 03. Auth and vendor onboarding

**Goal:** a visitor can sign up, choose a plan, name a store, pick a store link and land in their dashboard.

## Prompt

```
Read docs/CONTEXT.md. Use only RPCs and tables from the existing migration.

Build in src/features/auth and src/app:
1. Pages under src/app/(auth): /login, /signup, /forgot-password, /reset-password, plus the Supabase auth
   callback route handler (/auth/callback) that exchanges the code for a session and redirects to `next`.
   Signup collects full name, email, password (min 8). Store full_name in user metadata (the DB trigger
   creates the profile). Use React Hook Form + Zod, Server Actions, toasts for errors.
2. Server helpers in src/features/auth/queries.ts: `getCurrentUser()`, `requireUser()` (redirects to /login?next=),
   `getMyTenants()` (tenant_members joined to tenants: id, slug, name, role, status) and `isPlatformAdmin()`
   (calls rpc is_platform_admin).
3. Post-login redirect logic in one function `resolveHome(user)`:
   super admin -> /super-admin; exactly one store -> /dashboard/{slug}; several -> /dashboard (store picker);
   none -> /onboarding.
4. /onboarding (requires login), a 3-step wizard:
   Step 1: choose a plan. Load active plans from `plans` ordered by sort_order. Show a Monthly/Yearly toggle
           (filter by billing_interval), price in INR, trial days badge, and the `features` list.
           Read ?plan=<code> to preselect (the pricing page will link here).
   Step 2: store name.
   Step 3: store link. Show `{slug}.{NEXT_PUBLIC_ROOT_DOMAIN}`. Auto-suggest the slug from the name
           (lowercase, hyphens). Validate with the same regex as the DB: ^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$.
           Check availability with a debounced Server Action that queries the `tenants` table through the
           service-role client and returns only { available: boolean }. (Final truth is the DB unique constraint.)
   Submit calls rpc `create_tenant(p_name, p_slug, p_plan_code)`. Map errors with friendlyMessage;
   23505 -> "That store link is taken."
   After success: if the plan has trial_days > 0 or price is 0 -> /dashboard/{slug};
   otherwise (paid, no trial) -> /dashboard/{slug}/billing?subscribe=1.
5. /dashboard (store picker) when the user owns several stores.
6. Header with user menu (name, "Switch store", "Logout") reused across dashboard layouts.
7. Protect: /dashboard/*, /onboarding and /super-admin require login (middleware redirect to
   /login?next=<path>). Do the real authorisation in layouts using getUser, not just in middleware.

Edge cases to handle: user already has 5 stores (TENANT_LIMIT), plan became inactive between steps (PLAN_NOT_FOUND),
double-submit (disable button, idempotent redirect).
Run lint, typecheck, build.
```

## Manual check
- [ ] Sign up -> confirm email (local Supabase: Inbucket at http://localhost:54324) -> onboarding opens
- [ ] Create store "Shop A" with slug `shop-a` on Starter -> redirected to `/dashboard/shop-a`
- [ ] Studio shows rows in `tenants`, `tenant_members` (role owner), `subscriptions` (status `trialing`)
- [ ] Trying slug `admin` or `shop-a` again shows a friendly error
