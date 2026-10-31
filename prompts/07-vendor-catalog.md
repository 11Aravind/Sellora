# 07. Vendor dashboard: categories, products, images, team, plan-limit UX

**Goal:** a vendor manages their catalog, sees usage against plan limits, and hits friendly upgrade prompts at the limit.

## Prompt

```
Read docs/CONTEXT.md. Tables: categories, products, product_images, tenant_members. RPC: tenant_usage. Storage bucket: product-images.

Build src/app/dashboard/[tenant]/* using src/features/catalog and src/features/tenants:
1. Layout (src/app/dashboard/[tenant]/layout.tsx):
   - resolve the tenant by slug through the user's membership (tenants RLS already limits rows). Not a member -> notFound().
   - sidebar: Overview, Products, Categories, Orders, Team, Billing, Settings; store switcher; link "View store" (opens
     {slug}.rootdomain); <SubscriptionBanner/>; role-aware menu (staff cannot see Team/Billing/Settings).
2. <UsageMeter/> (src/components/shared) driven by rpc tenant_usage: progress bars for products, team members,
   orders this month; amber at 80%, red at 100%; "Upgrade" button. Show it on Overview and the Products page.
3. Categories: list + create/edit/delete dialog, optional parent, auto-slug, sort order. Unique slug per tenant -> friendly error.
4. Products list: search by name/sku, filter by status and category, sort, pagination (20/page), stock badge
   (out of stock / low <= 5), bulk archive. Button "Add product" shows remaining quota ("12 of 30 used");
   at 100% show the upgrade dialog instead of navigating (the DB would reject anyway).
5. Product form (create + edit): name, slug (auto, editable, unique per tenant), description (plain text/markdown, escaped on render),
   price, compare-at price, sku, stock, track inventory, status (draft/active/archived), category, images.
   - Create the product row first to get its id, then upload files to bucket `product-images` at
     `{tenant_id}/{product_id}/{uuid}.{ext}` using the browser client, then insert `product_images` rows.
   - Image rules: jpeg/png/webp only, max 5 MB each, max 8 per product, reorder (position), delete (remove file + row), alt text.
   - On error PLAN_LIMIT_PRODUCTS / SUBSCRIPTION_INACTIVE show the upgrade dialog with the friendly message.
   - Un-archiving a product also counts toward the limit; handle the same error.
   - Deleting: soft delete = archive (default). Hard delete only for products with no order_items; also clean storage.
6. Team page (owner/admin only): list members, add a member by email (server action: find the user by email with the
   service-role admin API, only if they already have an account; otherwise show "Ask them to sign up first, then add them"),
   change role (admin/staff), remove. On PLAN_LIMIT_STAFF show the upgrade dialog. Owner cannot be removed or changed.
7. Settings page: store name, logo upload (same bucket, path `{tenant_id}/branding/...`), storefront theme settings stored in
   tenants.settings (primaryColor, tagline, bannerUrl, contact phone/email, address). Public-only data: warn "do not put secrets here".
   Custom domain field (only editable when the plan allows; on PLAN_LIMIT_DOMAIN show the upgrade dialog) with DNS instructions text.
8. Overview: today/7-day orders and revenue, low-stock list, usage meter, recent orders (the orders table is built in prompt 09,
   so show an empty state if it has no data yet).

All forms: React Hook Form + Zod; loading/empty/error states; mobile friendly tables (cards on small screens).
Run lint, typecheck, build.
```

## Manual check
- [ ] On the Starter plan add 30 products; the 31st shows the upgrade dialog and nothing is created
- [ ] Archive one -> you can add another; un-archiving when full is blocked
- [ ] A second account (not a member) opening `/dashboard/shop-a/products` gets 404
- [ ] Upload a 10 MB file or a `.pdf` -> rejected with a clear message
- [ ] Staff user can't open Team/Billing/Settings
