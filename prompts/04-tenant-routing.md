# 04. Tenant routing: `{slug}.yourdomain.com` and custom domains

**Goal:** visiting a vendor's subdomain (or custom domain) shows their storefront; the main domain keeps marketing, auth, dashboard and super admin.

## Prompt

```
Read docs/CONTEXT.md. Extend the existing middleware (do not replace the session refresh).

1. src/lib/tenancy/host.ts: pure, unit-testable functions.
   - `parseHost(hostHeader, rootDomain)` -> { kind: 'root' } | { kind: 'subdomain', slug } | { kind: 'custom', domain }.
     Strip the port when comparing; treat `www` and `app` as root. Lowercase everything.
     Root domain comes from NEXT_PUBLIC_ROOT_DOMAIN (e.g. `localhost:3000` or `yourdomain.com`).
     `*.localhost` must work in development.
   - Reserved subdomains (www, app, admin, api, dashboard, super-admin, static, assets, mail, support, help,
     blog, docs, status, login, signup) are treated as root.
2. Middleware behaviour:
   - root host: continue normally. In production only, redirect `/stores/{slug}/...` on the root host to
     `https://{slug}.{rootDomain}/...` so each store has one canonical URL (keep /stores/{slug} reachable in development).
   - subdomain host: rewrite (not redirect) `/` and any path to `/stores/{slug}{path}`. Do NOT rewrite
     /_next, /api/webhooks, /auth/callback, static files.
   - custom host: resolve slug by calling rpc `storefront_tenant` with p_domain using the anon client
     (cache the result in-memory for 60 seconds per host), then rewrite to /stores/{slug}{path}.
     Unknown host -> 404 page.
   - On tenant hosts, never serve /dashboard or /super-admin: redirect them to the same path on the root domain.
3. src/app/stores/[slug]/layout.tsx:
   - Fetch the tenant with rpc `storefront_tenant(p_slug)` (React `cache()` so it's deduped per request).
   - Not found -> notFound(). `is_open === false` -> render a friendly "This store is temporarily unavailable" page
     (no product data). Otherwise render a basic shell: header with store name/logo, children, footer.
   - Expose the tenant via a small React context for client components.
4. A placeholder src/app/stores/[slug]/page.tsx that prints the store name (real storefront comes in prompt 08).
5. Auth cookies are per host, so customers sign in separately on each store host. Make sure the Supabase server
   client reads cookies of the current request host and that the callback route works on subdomains.
   Add a short docs/ROUTING.md explaining all of this, including how to test locally with
   shop-a.localhost:3000 and the lvh.me fallback.
6. Write unit tests for parseHost using the project's test runner (add Vitest as a dev dependency; tell me when you do).

Run lint, typecheck, build, tests.
```

## Manual check
- [ ] `http://localhost:3000` -> marketing page; `http://shop-a.localhost:3000` -> store name page
- [ ] `http://nope.localhost:3000` -> 404
- [ ] `http://shop-a.localhost:3000/dashboard` redirects to `http://localhost:3000/dashboard`
- [ ] In Studio set `UPDATE subscriptions SET trial_ends_at = now() - interval '1 day'` -> the store shows "temporarily unavailable"
