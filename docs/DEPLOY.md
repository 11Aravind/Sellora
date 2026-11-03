# Production Deployment Guide: Vercel & Supabase Cloud

This document provides a copy-paste checklist for taking the multi-tenant SaaS Commerce Kit into production.

---

## Architecture Overview

```
                   [ Internet Users / Customers / Vendors ]
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
 Apex Domain: yourapp.in                         Tenant Stores: {tenant}.yourapp.in
 Custom Domains: customstore.com
           │                                                   │
           └─────────────────────────┬─────────────────────────┘
                                     │
                           [ Vercel Edge Network ]
                                 (bom1 Mumbai)
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
            Next.js App Router               Static / Edge Assets
        (Middleware multi-tenant routing)
                     │
          ┌──────────┴──────────┬────────────────────────┐
          ▼                     ▼                        ▼
[ Supabase Cloud (PostgreSQL) ] [ Razorpay Live Gateway ] [ Firebase Cloud Messaging ]
  - RLS Security Policies         - Webhook verification    - Web Push Notifications
  - Auth & Wildcard Redirects     - Recurring Subscriptions - Background Service Worker
  - Storage (product-images)
```

---

## 1. Domain & DNS Preparation

### 1.1 Buy Domain
- Purchase your root domain (e.g., `yourapp.in` via Cloudflare, Namecheap, GoDaddy, etc.).

### 1.2 DNS Records for Vercel
To support wildcard subdomains (`*.yourapp.in`) and SSL certificates, **Vercel requires delegating nameservers** or specific records:
- **Recommended**: Assign nameservers in your domain registrar to Vercel:
  - `ns1.vercel-dns.com`
  - `ns2.vercel-dns.com`
- **Alternative (if managing DNS at Cloudflare/Route53)**:
  - `A` record: `@` -> `76.76.21.21`
  - `CNAME` record: `*` -> `cname.vercel-dns.com`
  - *Note: Ensure Cloudflare proxy (orange cloud) is turned OFF (DNS only) for wildcard subdomains to allow Vercel to issue Let's Encrypt certificates.*

---

## 2. Supabase Cloud Setup

### 2.1 Project Creation
1. Go to [database.new](https://database.new) and create a new project.
2. Choose a region closest to your primary target market (e.g., **South Asia / Mumbai - ap-south-1**).
3. Set a strong database password and note down your Reference ID (`<project-ref>`).

### 2.2 CLI Link & Database Migration
Run the following commands from your local machine:
```bash
# Login to Supabase CLI
npx supabase login

# Link your local repo to your cloud project
npx supabase link --project-ref <your-supabase-project-ref>

# Push all migrations to production database
npx supabase db push
```

### 2.3 Subscription Plans Seed
Before seeding plans, open `supabase/seed.sql` and verify plan pricing and Razorpay metadata:
```bash
# Push seed data (run via Supabase SQL Editor or CLI)
npx supabase db execute --file supabase/seed.sql
```

### 2.4 Create the First Super Admin
1. Navigate to your app URL or Supabase Auth UI and sign up your admin user account (e.g. `admin@yourapp.in`).
2. Run the following SQL query in the **Supabase Cloud SQL Editor**:
```sql
UPDATE public.profiles 
SET is_super_admin = true 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@yourapp.in' LIMIT 1
);
```

### 2.5 Storage Buckets
The storage bucket `product-images` and its RLS policies are created automatically in the migrations.
Verify in **Supabase Dashboard > Storage**:
- Bucket: `product-images` (Public: `true`)
- Policies: Public can read; Authenticated tenant members can upload/delete files within their tenant path.

### 2.6 Supabase Auth Configuration
In **Supabase Dashboard > Authentication > URL Configuration**:
1. **Site URL**: `https://yourapp.in`
2. **Redirect URLs**: Add the following patterns:
   - `https://yourapp.in/**`
   - `https://*.yourapp.in/**`
   - `http://localhost:3000/**` (for local development testing)
3. In **Authentication > Email Templates / Providers**:
   - Turn on **Confirm Email** if mandatory verification is desired.
   - Configure **Custom SMTP Provider** (e.g., Resend, Amazon SES, SendGrid, Postmark).
   > [!IMPORTANT]
   > The default Supabase built-in email service is rate-limited to 30 emails per hour and will fail under production signup traffic. Custom SMTP is mandatory for production.

---

## 3. Vercel Deployment Setup

### 3.1 Project Creation
1. In Vercel Dashboard, click **Add New > Project** and import your Git repository.
2. Select Framework Preset: **Next.js**.
3. Choose Root Directory: `./` (or leave default).

### 3.2 Environment Variables
Add the following production environment variables under **Project Settings > Environment Variables**:

| Variable Name | Environment | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Production | `https://yourapp.in` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Production | `yourapp.in` |
| `NEXT_PUBLIC_SUPABASE_URL` | Production | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Supabase Anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Supabase Service Role secret key |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Production | Razorpay Live Key ID (`rzp_live_...`) |
| `RAZORPAY_KEY_ID` | Production | Razorpay Live Key ID (`rzp_live_...`) |
| `RAZORPAY_KEY_SECRET` | Production | Razorpay Live Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Production | Razorpay Live Webhook Secret |
| `CRON_SECRET` | Production | Secure random string (e.g., `openssl rand -hex 32`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Production | Firebase Web API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Production | `<project-id>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Production | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Production | Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Production | Firebase App ID |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Production | Firebase Cloud Messaging VAPID Web Key |
| `FIREBASE_PROJECT_ID` | Production | Firebase Project ID |
| `FIREBASE_CLIENT_EMAIL` | Production | Firebase Service Account Email |
| `FIREBASE_PRIVATE_KEY` | Production | Firebase Service Account Private Key (with `\n` line breaks) |
| `VERCEL_API_TOKEN` | Production | Vercel personal / team token (for Custom Domains feature) |
| `VERCEL_PROJECT_ID` | Production | Project ID from Vercel Project Settings > General |
| `VERCEL_TEAM_ID` | Production (Optional) | Team ID (if deploying under a Vercel team) |

### 3.3 Domain Configuration in Vercel
1. In **Project Settings > Domains**:
   - Add `yourapp.in` (redirect root or primary domain).
   - Add `*.yourapp.in` (wildcard domain).
2. Ensure both domains display green checkmarks for DNS and SSL certificate status.

### 3.4 Function Region
In **Project Settings > Functions > Function Region**:
- Set to `bom1` (Mumbai, India) to match the Supabase database region and eliminate cross-region roundtrip latencies.

---

## 4. Razorpay Live Configuration

1. In the Razorpay Dashboard, toggle from **Test Mode** to **Live Mode**.
2. Generate Live API Keys (`Key ID` and `Key Secret`) and update Vercel environment variables.
3. **Re-generate Live Subscription Plans**:
   - Razorpay Plan IDs created in Test Mode (`plan_test_...`) **cannot** be used in Live Mode.
   - Navigate to `https://yourapp.in/super-admin/plans`.
   - Edit each plan and save it. The system automatically calls Razorpay Live API, generates a new `plan_live_...` ID, and updates the database record.
4. **Configure Live Webhook**:
   - In Razorpay Dashboard > Settings > Webhooks > Add New Webhook:
     - **Webhook URL**: `https://yourapp.in/api/webhooks/razorpay`
     - **Secret**: Enter the value of `RAZORPAY_WEBHOOK_SECRET`.
     - **Active Events**:
       - `subscription.charged`
       - `subscription.halted`
       - `subscription.cancelled`
       - `subscription.paused`
       - `subscription.resumed`

---

## 5. Firebase Cloud Messaging Setup

1. In Firebase Console > Project Settings > General:
   - Add Web App and copy client SDK config.
2. In Firebase Console > Cloud Messaging > Web configuration:
   - Generate Web Push Certificate (VAPID key).
3. In Firebase Console > Authentication > Settings > Authorized Domains:
   - Add `yourapp.in`
   - Add `*.yourapp.in`
4. Verify that `/firebase-messaging-sw.js` is served from the root URL (`https://yourapp.in/firebase-messaging-sw.js`).

---

## 6. Scheduled Cron Jobs

The project includes `vercel.json` configured for:
- `/api/cron/expire-subscriptions`: Daily at midnight (`0 0 * * *`)
- `/api/cron/billing-reminders`: Daily at 6:00 AM (`0 6 * * *`)

### Securing Cron Endpoints
Every cron endpoint requires the `Authorization: Bearer <CRON_SECRET>` header. Vercel automatically includes this header in production if `CRON_SECRET` is set in project environment variables.

### Alternative Schedulers (if Vercel Cron limitations apply)
If using Vercel Hobby plan (limited to 1 cron per day):
1. **Supabase `pg_cron` + `pg_net`**:
   ```sql
   select cron.schedule(
     'expire-subscriptions-daily',
     '0 0 * * *',
     $$
     select net.http_post(
       url := 'https://yourapp.in/api/cron/expire-subscriptions',
       headers := jsonb_build_object('Authorization', 'Bearer <YOUR_CRON_SECRET>')
     );
     $$
   );
   ```
2. **GitHub Actions Workflow**:
   Create `.github/workflows/crons.yml` with a `schedule` trigger calling `curl` with the bearer token.

---

## 7. Custom Domains Feature (White-labeling)

For tenants on plans with `custom_domain_allowed = true`:
1. The tenant enters their apex domain (e.g. `shop.vendor.com`).
2. The UI shows DNS records:
   - CNAME `cname.vercel-dns.com` (for subdomains like `shop.vendor.com`)
   - A Record `76.76.21.21` (for apex domains like `vendor.com`)
3. The tenant clicks **Verify & Save Domain**.
4. The server action calls the Vercel Domains API (`/v9/projects/{projectId}/domains`), validates SSL and DNS status, and updates `tenants.custom_domain`.

---

## 8. Backups & Disaster Recovery

### 8.1 Supabase Backup Strategies
1. **Automated Daily Backups (Included on Supabase Pro)**:
   - Retained for 7 days (or 30 days depending on tier).
   - Restore directly via Supabase Dashboard > Project Settings > Backups.
2. **Point-In-Time Recovery (PITR)**:
   - Available on Pro plan as an add-on. Enables restoration to any second in the past up to 7 days.
   - Recommended for high-volume order transactions.
3. **Manual CLI Dump**:
   ```bash
   # Export schema and data to SQL file
   npx supabase db dump --linked --data-only > backup_$(date +%F).sql
   ```

### 8.2 Recovery Procedure
1. Create a temporary standby Supabase project.
2. Restore the latest backup or replay the SQL dump.
3. Update `NEXT_PUBLIC_SUPABASE_URL` and keys in Vercel to switch traffic in an emergency.

---

## 9. Observability & Monitoring Proposals

| Tool | Purpose | Recommended Tier | Implementation |
|---|---|---|---|
| **Sentry** (`@sentry/nextjs`) | Real-time frontend and server crash reporting, breadcrumbs, source maps | Free Developer / Team | Run `npx @sentry/wizard@latest -i nextjs` |
| **Better Stack** (Better Uptime) | Uptime ping monitoring, SSL expiry alerts, public status page | Free / Starter | Ping `https://yourapp.in/api/health` every 1 minute |
| **Axiom** or **Datadog** | Structured log aggregation for Next.js and Vercel edge logs | Free / Vercel Integration | 1-click Vercel marketplace integration |
| **Supabase Database Reports** | Slow query identification, connection pool health, disk IOPS | Supabase Dashboard | Review Reports > Database weekly |

---

## 10. Pre-Flight Verification Checklist

- [ ] `https://yourapp.in` loads marketing home page with 200 OK.
- [ ] `https://demo.yourapp.in` loads tenant storefront.
- [ ] `https://invalidtenant.yourapp.in` shows tenant 404 page.
- [ ] Root marketing `/robots.txt` and `/sitemap.xml` return valid XML/text.
- [ ] New user signup triggers confirmation email via custom SMTP.
- [ ] Vendor upgrade to a paid plan initiates Razorpay live checkout.
- [ ] Razorpay webhook successfully updates subscription status to `active`.
- [ ] Test order placed on storefront updates store inventory and triggers push notification.
- [ ] Manual curl to `/api/cron/expire-subscriptions` returns 401 without bearer token and 200 with valid bearer token.

