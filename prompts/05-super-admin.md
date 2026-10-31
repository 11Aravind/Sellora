# 05. Super admin: plan builder, stores, subscriptions

**Goal:** you (the platform owner) create and edit plans with limits, and see/suspend stores.

## Do this first
Make your account a super admin (see README section 5): insert your user id into `platform_admins`.

## Prompt

```
Read docs/CONTEXT.md. Tables: plans, tenants, tenant_members, subscriptions, subscription_payments, profiles.

Build the /super-admin area (src/app/super-admin, logic in src/features/plans and src/features/tenants):
1. Layout guard: call isPlatformAdmin(); if false -> notFound() (do not reveal the area exists).
   Sidebar: Overview, Plans, Stores, Subscriptions.
2. Overview: cards for total stores, active stores, trialing, paying (status active), and estimated MRR
   (sum of active subscriptions' plan price, yearly plans divided by 12), plus the 10 newest stores.
   Compute with SQL aggregates via the service-role client in queries.ts (server only).
3. Plans page:
   - Table: name, code, interval, price (INR), trial days, limits (products/staff/orders), active toggle, #stores using it.
   - Create/Edit plan form (Zod) with fields: code (immutable after creation), name, description,
     billing interval (month/year), price in rupees (convert to paise on save), trial days,
     max products / max staff / max orders per month (each with an "Unlimited" switch that stores NULL),
     custom domain allowed (switch), marketing features (add/remove/reorder list -> jsonb array), sort order, active.
   - Use the NORMAL authenticated Supabase client for plan writes: RLS already allows platform admins.
   - Deleting a plan is not allowed if subscriptions reference it (FK): show "Deactivate instead".
   - Warn when editing limits of a plan that already has stores: "Changes apply to existing stores immediately."
   - Add a hook point `syncPlanToRazorpay(plan)` called after create/update when price_paise > 0. For now it can
     be a no-op stub that logs; prompt 06 implements it. Do NOT implement Razorpay here.
   - Show a live preview card of how the plan will look on the pricing page.
4. Stores page: search by name/slug/owner email, filter by status and plan; columns: store, owner, plan, subscription
   status, products used / limit, created. Row actions: View, Suspend/Reactivate (rpc admin_set_tenant_status with confirm dialog).
   Store detail page: members, subscription history, payments, usage (rpc tenant_usage), recent orders count.
5. Subscriptions page: list with filters by status, trial ending soon (next 7 days), past_due.
6. All lists: server-side pagination (20/page), loading skeletons, empty states.

Security: every Server Action re-checks isPlatformAdmin() on the server. Never trust a hidden form field.
Run lint, typecheck, build.
```

## Manual check
- [ ] Non-admin account visiting `/super-admin` gets 404
- [ ] Create plan "Mini" (monthly, Rs 199, max products 10, 7-day trial) -> appears in onboarding step 1
- [ ] Set "max products = Unlimited" -> column in Studio is `NULL`
- [ ] Suspend a store -> its storefront returns "unavailable"; reactivate restores it
