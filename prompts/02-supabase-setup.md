# 02. Supabase setup: database, clients, types, session middleware

**Goal:** the schema is applied, the app can talk to Supabase safely from server and browser, and types are generated.

## Do this yourself first (agents can't see your Docker)
```bash
supabase init            # only if supabase/config.toml does not exist
supabase start           # needs Docker
supabase db reset        # applies migrations/ then seed.sql
```
Copy the printed `API URL`, `anon key` and `service_role key` into `.env.local`.

## Prompt

```
Read docs/CONTEXT.md and supabase/migrations/20261101000000_init.sql completely before writing code.
The schema is already applied locally. Do NOT modify the migration.

Implement:
1. `pnpm supabase gen types typescript --local > src/types/database.ts` (add as a package.json script
   "db:types"). Use the generated `Database` type everywhere.
2. src/lib/supabase/client.ts   : createBrowserClient<Database> from @supabase/ssr.
3. src/lib/supabase/server.ts   : createServerClient<Database> using next/headers cookies (async cookies API
   of the installed Next.js version). Export `createClient()`.
4. src/lib/supabase/admin.ts    : service-role client. First line `import 'server-only'`. Disable session persistence.
5. src/lib/supabase/middleware.ts: `updateSession(request)` that refreshes the auth session cookies and returns
   { response, user }. Use `supabase.auth.getUser()` (NOT getSession) for any trust decision.
6. Root middleware (src/middleware.ts, or src/proxy.ts if the installed Next.js uses that convention) that calls
   updateSession. Matcher must exclude _next/static, _next/image, favicon, images and files with extensions.
   Tenant routing will be added in a later prompt: leave a clearly marked TODO.
7. src/lib/errors.ts:
   - `parseDbError(error)` extracts the code prefix before ':' from a Postgres error message
     (PLAN_LIMIT_PRODUCTS, PLAN_LIMIT_STAFF, PLAN_LIMIT_ORDERS, PLAN_LIMIT_DOMAIN, SUBSCRIPTION_INACTIVE,
     AUTH_REQUIRED, FORBIDDEN, OUT_OF_STOCK, PRODUCT_UNAVAILABLE, EMPTY_CART, INVALID_ITEM, STORE_NOT_FOUND,
     STORE_UNAVAILABLE, RESERVED_SLUG, INVALID_SLUG, INVALID_NAME, TENANT_LIMIT, PLAN_NOT_FOUND) and
     Postgres code 23505 (unique violation) and 42501 / "row-level security" (permission).
   - `friendlyMessage(code, ctx?)` returns a user-facing sentence for each, e.g.
     PLAN_LIMIT_PRODUCTS -> "You've reached your plan's product limit. Upgrade to add more."
   - A typed `ActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string }`.
8. A Server Action helper `safeAction` in src/lib/actions.ts that wraps an async function, catches errors,
   maps them with parseDbError/friendlyMessage and returns ActionResult. Never leak raw SQL errors to users.
9. src/app/api/health/route.ts: queries `plans` with the anon client and returns { ok, plans: count }.
10. Tighten src/lib/env.ts: Supabase variables become required.

Then run lint, typecheck, build. Show me the contents of errors.ts and middleware.ts for review.
```

## Manual check
- [ ] `curl localhost:3000/api/health` returns `{ "ok": true, "plans": 6 }`
- [ ] `grep -R "SUPABASE_SERVICE_ROLE_KEY" src` only matches `lib/env.ts` and `lib/supabase/admin.ts`
- [ ] Run the DB tests: `psql "<DB_URL>" -f supabase/tests/rls_and_limits.test.sql` ends with `ALL TESTS PASSED`
