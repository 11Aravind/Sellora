# 12. Deploy: Vercel + Supabase Cloud

**Goal:** the platform runs on your real domain with wildcard subdomains.

## Do this yourself (accounts and DNS)
1. Buy a domain (e.g. `yourapp.in`).
2. Create a Supabase project (choose a region close to your users, e.g. Mumbai) and a Vercel project linked to your repo.
3. In your DNS provider (or Vercel DNS) you will need: `yourapp.in` and `*.yourapp.in` both pointing at Vercel.
   Wildcard domains on Vercel require using Vercel nameservers for that domain: check their current docs.

## Prompt

```
Read docs/CONTEXT.md. Prepare the project for production. Check the CURRENT docs for Vercel (wildcard domains, cron jobs,
environment variables) and Supabase (CLI link/push, auth redirect URLs).

1. Write docs/DEPLOY.md as a copy-paste checklist covering:
   a) Supabase: `supabase link --project-ref <ref>`, `supabase db push`, run seed for plans (review prices first!),
      create the first super admin with the SQL snippet, enable the product-images bucket policies (already in the migration),
      Auth settings: Site URL, additional redirect URLs including a wildcard for tenant subdomains
      (https://*.yourapp.in/**), email confirmation on, SMTP provider configured (default email is rate limited).
   b) Vercel: set every variable from .env.example (production values), root domain `NEXT_PUBLIC_ROOT_DOMAIN=yourapp.in`,
      add domains `yourapp.in` and `*.yourapp.in`, region close to Supabase.
   c) Razorpay: switch to live keys, create live plans by re-saving each plan in /super-admin (so razorpay_plan_id is
      regenerated for live mode: store live ids separately from test ids, explain how), set the live webhook URL and secret.
   d) Firebase: add the production domain to authorised domains; service worker must be served from the root path.
   e) Cron: add vercel.json crons for /api/cron/expire-subscriptions (daily) and /api/cron/billing-reminders (daily),
      each sending the CRON_SECRET bearer header (if the plan's cron limits are an issue, document an alternative such as
      Supabase pg_cron + pg_net or GitHub Actions on a schedule).
   f) Custom domains (optional feature): implement a server action using the Vercel Domains API to add/remove a vendor's
      domain on the project (requires VERCEL_API_TOKEN, VERCEL_PROJECT_ID, optional team id: add them to .env.example and
      env.ts), show the DNS records the vendor must create, and a "Verify" button that checks status and only then saves
      tenants.custom_domain. Only allowed on plans with custom_domain_allowed.
2. Add robots.txt/sitemap for the marketing site, a production error page, and basic structured logging.
3. Observability: propose (do not install yet) options for error tracking and uptime monitoring.
4. Backups: document enabling Supabase point-in-time recovery or daily backups and how to restore.
5. Create a "go-live" checklist in docs/LAUNCH.md: legal pages (Terms, Privacy, Refund policy: templates with TODOs),
   GST/invoice requirements for subscription fees, support email, status page, load test of checkout, test with real cards
   at minimum amounts, rollback plan.

Do not run any production command yourself. Output only files and instructions.
```

## Manual check
- [ ] `https://yourapp.in` loads; `https://anything.yourapp.in` shows 404 or that tenant's store
- [ ] Sign up, pay a real minimum-amount plan, webhook flips status to `active`
- [ ] Cron endpoints return 401 without the secret and 200 with it
