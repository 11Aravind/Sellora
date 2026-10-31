# 13. Backlog: features to add later (Bagisto parity and beyond)

Each item below is a standalone prompt you can run after the core is live.
Pattern for every one: **new migration file** -> `supabase db reset` -> regenerate types -> RLS + tests -> UI.
Study the matching module in `https://github.com/bagisto/bagisto` (`packages/Webkul/*`) for ideas, but implement in this stack.

| Priority | Feature | Why | Starter prompt |
|---|---|---|---|
| High | **Online payments for customers** | Vendors will want prepaid orders | "Design per-vendor payment collection. Compare Razorpay Route (linked accounts) vs vendors entering their own Razorpay keys (encrypted at rest, never in tenants.settings). Propose the schema, onboarding/KYC flow and webhook routing, then wait for my choice." |
| High | **Shipping and delivery charges** | `orders.shipping_amount` exists but is always 0 | "Add per-tenant shipping rules (flat, free above X, by PIN-code zone) in a new migration, apply them inside `place_order`, and add a vendor settings screen." |
| High | **GST / tax** | Required for Indian sellers | "Add tax classes and rates per tenant (GST slabs), inclusive/exclusive pricing, tax breakup on orders and invoices (PDF)." |
| High | **Customer address book + saved checkout info** | Faster repeat orders | "Add `customer_addresses` with RLS and use them in checkout." |
| Medium | **Product variants and options** (size, colour) | Bagisto has configurable products | "Add options/variants with their own sku, price, stock; update cart, `place_order` and the vendor product form." |
| Medium | **Coupons / discounts** | Marketing | "Add coupons (percent/fixed, min cart, usage limits, expiry) validated inside `place_order`." |
| Medium | **Reviews and ratings** | Trust | "Verified-buyer reviews with vendor moderation." |
| Medium | **Staff invitations by email** | Today only existing users can be added | "Invitation table + email link + accept flow, still honouring `max_staff`." |
| Medium | **Abandoned cart + email notifications** | Recover sales | "Transactional emails (order placed, shipped) via a provider I choose. Ask me which." |
| Medium | **Pages/CMS and blog** | Store content | "Add `store_pages` (about, policies) editable by vendors with sanitised markdown." |
| Medium | **Analytics** | Vendor value | "Sales over time, top products, conversion basics on the vendor dashboard." |
| Low | **Themes** | Differentiation | "Define 3 storefront themes selectable in settings (layout + tokens), stored in `tenants.settings.theme`." |
| Low | **Multi-currency / multi-language** | Expansion | "i18n for storefront and currency formatting per tenant." |
| Low | **Marketplace mode** | One storefront with many sellers (Bagisto Multi-Vendor) | "Optional global marketplace page listing products across tenants with commission tracking." |
| Low | **Audit log + data export** | Compliance | "Append-only `audit_log` for admin actions; export store data as CSV/ZIP." |
| Low | **PWA / mobile app** | Reach | "PWA manifest and install prompt for storefronts; evaluate a React Native vendor app." |

## Before each backlog item
```
Read docs/CONTEXT.md. Before coding, write a short design note (tables, RLS policies, limits impact on plans, UI screens, risks)
and wait for my approval. Then implement with a new migration and tests.
```
