# 11. Security hardening and automated tests

**Goal:** prove tenant isolation and plan limits with tests, and close the usual SaaS holes before real users arrive.

## Prompt

```
Read docs/CONTEXT.md and docs/ROUTING.md. Act as a security reviewer first, then fix what you find.

PART A: audit (write findings to docs/SECURITY-AUDIT.md with severity and the fix applied)
1. Search the code for every use of the service-role client (`lib/supabase/admin`). For each, confirm it is
   server-only, preceded by an explicit authorisation check (isPlatformAdmin / tenant owner / verified webhook / CRON_SECRET),
   and scoped by tenant id. List them in a table.
2. Confirm no secret appears in client bundles: grep for process.env usage in files marked 'use client', and check
   that only NEXT_PUBLIC_* variables are referenced there.
3. Check every Server Action: Zod validation of all input, auth check, tenant membership check, no raw SQL errors returned.
4. Check file uploads: type allow-list, size limits, storage paths always start with the caller's tenant id.
5. Check that user-supplied text (product description, store tagline, customer notes, addresses) is rendered escaped.
   No dangerouslySetInnerHTML without a sanitiser.
6. Webhooks: raw-body signature verification, idempotency, no auth cookies required.
7. Review the SQL migrations again for: SECURITY DEFINER functions without `set search_path`, tables without RLS,
   policies using `true`, functions callable by anon that should not be (revoke execute where appropriate).
   Run Supabase's built-in security advisor / `supabase db lint` and fix warnings.

PART B: hardening
8. Security headers in next.config (CSP appropriate for Razorpay Checkout, Firebase and Supabase; HSTS; X-Content-Type-Options;
   Referrer-Policy; frame-ancestors none). Test that Razorpay Checkout and FCM still work.
9. Rate limiting for: login/signup/forgot-password, place_order, slug availability check, store enumeration.
   Do NOT add a new dependency without asking me; propose options (Vercel Firewall rules, Supabase Auth rate-limit
   settings, or a Postgres-backed limiter) and implement the one I choose.
10. Enable email confirmation and password rules in Supabase Auth config; document required dashboard settings.

PART C: tests
11. Keep supabase/tests/rls_and_limits.test.sql green. Add a GitHub Actions workflow that starts Supabase locally,
    runs `supabase db reset`, then the SQL tests.
12. Playwright E2E (add as dev dependency, tell me when you do) covering:
    a) vendor signup -> onboarding -> create store -> add 30 products -> 31st blocked with upgrade dialog;
    b) customer places an order on the subdomain and sees it in history; vendor sees it in the dashboard;
    c) vendor B cannot open vendor A's dashboard URLs or product edit pages (404);
    d) expired trial (set via service role in test setup) locks writes and hides the storefront;
    e) tampered cart prices do not change the order total.
13. Unit tests for parseHost, friendlyMessage/parseDbError, Zod schemas.

Run everything; report what is green and anything you could not verify.
```

## Manual check
- [ ] `docs/SECURITY-AUDIT.md` lists every service-role use with its guard
- [ ] CI passes on a fresh clone
- [ ] Open DevTools on the storefront: no secrets in the JS bundles or network responses
