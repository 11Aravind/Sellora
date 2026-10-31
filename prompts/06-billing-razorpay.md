# 06. Pricing page and subscription billing (Razorpay)

**Goal:** public pricing page, vendors can pay for a plan, free trials work, webhooks keep `subscriptions` in sync, vendors can change/cancel.

## Do this first
Create a Razorpay account (test mode), copy Key ID/Secret into `.env.local`.
Expose your local server for webhooks with a tunnel (ngrok / cloudflared) and add the webhook URL
`https://<tunnel>/api/webhooks/razorpay` in Razorpay dashboard -> Webhooks with a secret; put it in `RAZORPAY_WEBHOOK_SECRET`.
Subscribe the webhook to: subscription.authenticated, subscription.activated, subscription.charged,
subscription.pending, subscription.halted, subscription.cancelled, subscription.completed, payment.failed.

## Prompt

```
Read docs/CONTEXT.md. IMPORTANT: use the CURRENT official Razorpay documentation for Plans, Subscriptions,
Checkout and Webhooks (fetch the docs). Do not guess field names.

Implement:
1. src/lib/billing/razorpay.ts (server-only): SDK client, plus helpers.
   `verifyWebhookSignature(rawBody, signature, secret)` using HMAC-SHA256 and crypto.timingSafeEqual.
2. `syncPlanToRazorpay(plan)` (replace the stub from prompt 05): when price_paise > 0 and razorpay_plan_id is
   empty, create a Razorpay plan (period monthly/yearly, interval 1, amount in paise, currency INR) and save the
   id back to plans.razorpay_plan_id (service role). Razorpay plans are immutable: if the PRICE or INTERVAL of an
   existing plan changes, create a new Razorpay plan and update the id; existing subscribers keep their old price.
   Show that warning in the super-admin edit form.
3. Public /pricing page (src/app/(marketing)/pricing): Monthly/Yearly toggle, cards from active plans
   (price, trial badge, features, limits), CTA -> /signup?plan=<code> (or /onboarding?plan=<code> if logged in).
   Yearly cards show "Save X%" compared to 12x the matching monthly plan when one exists (match by name prefix before " (").
4. Server Action `startCheckout(tenantId)` (owner only, re-verified on server):
   - load the tenant's live subscription (status incomplete or trialing) and its plan;
   - create a Razorpay subscription (plan_id = razorpay_plan_id, total_count suitable for the interval,
     notes { tenant_id, subscription_id }); if the tenant is trialing, set start_at = trial_ends_at so the first
     charge happens after the trial (must be a future unix time);
   - save razorpay_subscription_id on the subscription row (service role);
   - return the Razorpay subscription id to the client.
5. Billing page /dashboard/[tenant]/billing: current plan, status badge, renewal/trial-end date, usage meters
   (rpc tenant_usage), payments table, buttons: Subscribe / Change plan / Cancel at period end.
   Client component loads Razorpay Checkout.js, opens it with the subscription id, and after the success handler
   shows "Confirming payment..." and polls the subscription status every 3 seconds (max 60 s) until active.
   NEVER mark a subscription active from the browser callback: only the webhook may do that.
6. Webhook route src/app/api/webhooks/razorpay/route.ts:
   - read the RAW body with `await req.text()`, verify x-razorpay-signature, reject with 400 if invalid;
   - find the subscription by razorpay_subscription_id (service role); ignore unknown ones with 200;
   - map events -> status updates: authenticated (keep trialing/incomplete), activated/charged -> 'active' with
     current_period_start/end from the payload (unix seconds), pending/halted -> 'past_due', cancelled -> 'cancelled'
     (access continues until current_period_end), completed -> 'expired';
   - on charged / payment.failed insert subscription_payments (unique razorpay_payment_id makes it idempotent;
     use upsert / ignore conflicts);
   - always respond 200 quickly after processing; log failures without secrets.
7. Plan change: implement upgrade/downgrade using Razorpay's update-subscription capability if the docs allow it
   for this plan type; otherwise cancel the old subscription at cycle end and start the new one. Explain which you
   chose in docs/BILLING.md along with the status lifecycle diagram (incomplete -> trialing -> active -> past_due ->
   cancelled/expired).
8. Cron route /api/cron/expire-subscriptions (requires header `Authorization: Bearer ${CRON_SECRET}`): sets
   status 'expired' for trialing rows past trial_ends_at and incomplete rows older than 7 days. (Access is already
   blocked by the database function; this only keeps statuses tidy.)
9. A reusable <SubscriptionBanner/> in the dashboard layout: trial ends in N days, payment failed, store locked
   (SUBSCRIPTION_INACTIVE) with a button to the billing page.

Run lint, typecheck, build.
```

## Manual check (use Razorpay test cards/UPI from their docs)
- [ ] `/pricing` shows plans; toggle switches monthly/yearly
- [ ] Start a trial store -> billing shows "Trial ends <date>"
- [ ] Pay in test mode -> webhook arrives -> status becomes `active`, a `subscription_payments` row appears
- [ ] Send the webhook twice -> no duplicate payment rows
- [ ] Tamper with the signature (curl) -> 400
- [ ] Cancel -> still works until period end; after that the store is locked
