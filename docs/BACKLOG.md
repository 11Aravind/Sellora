# Product Backlog: Bagisto Parity & Advanced SaaS Roadmap

This document formalizes the prioritized feature roadmap to expand the SaaS Commerce Kit towards full parity with enterprise e-commerce platforms like [Bagisto](https://github.com/bagisto/bagisto) while maintaining our multi-tenant Next.js + Supabase architecture.

---

## 1. Implementation Standard for Every Backlog Item

When starting work on any backlog item, adhere to this strict sequence:
1. **Design Note Approval**: Write a design artifact specifying database tables, foreign keys, RLS security policies, plan limit impacts, UI routes, and risk analysis. Wait for approval.
2. **New Migration File**: Create `supabase/migrations/<timestamp>_<feature_name>.sql`. Never alter past migrations.
3. **Database Reset & Type Generation**: Run `supabase db reset` and regenerate TypeScript types via `pnpm supabase:types`.
4. **Server Actions & Tests**: Implement server actions with Zod validation, RLS coverage tests, and unit tests.
5. **UI & Verification**: Build responsive vendor dashboard / storefront screens and verify with tests and lint.

---

## 2. Prioritized Roadmap & Starter Prompts

| Priority | Feature | Why It Matters | Reference / Module | Starter Prompt |
|---|---|---|---|---|
| **High** | **Online Payments for Customers** | Vendors need online prepaid customer checkouts (UPI, cards, netbanking) in addition to Cash on Delivery. | Bagisto `Webkul/Payment` | *"Design per-vendor payment collection. Compare Razorpay Route (linked accounts) vs vendors entering their own Razorpay keys (encrypted at rest, never in tenants.settings). Propose the schema, onboarding/KYC flow and webhook routing, then wait for my choice."* |
| **High** | **Shipping & Delivery Charge Rules** | `orders.shipping_amount` is currently 0. Vendors need flexible delivery pricing. | Bagisto `Webkul/Shipping` | *"Add per-tenant shipping rules (flat rate, free shipping threshold above ₹X, and PIN-code based delivery zones) in a new migration, apply them inside the `place_order` transactional function, and build the vendor settings screen."* |
| **High** | **GST & Tax Rules Engine** | Mandatory for Indian merchants to generate compliant tax invoices and reports. | Bagisto `Webkul/Tax` | *"Add tax classes and rates per tenant (0%, 5%, 12%, 18%, 28% GST slabs), inclusive/exclusive catalog pricing, tax breakup on order summaries and PDF tax invoice generation."* |
| **High** | **Customer Address Book & Saved Checkout Info** | Reduces friction for repeat storefront buyers. | Bagisto `Webkul/Customer` | *"Add `customer_addresses` table with RLS scoped to verified customer sessions, support multiple addresses (default billing/shipping), and prefill them in checkout."* |
| **Medium** | **Product Variants & Configurable Options** (Size, Color) | Merchants need apparel and multi-attribute product support. | Bagisto `Webkul/Product` Configurable | *"Add product attributes, options, and variant SKUs with separate pricing, images, and inventory stock; update cart state, the atomic `place_order` function, and vendor product management form."* |
| **Medium** | **Coupons & Discount Engine** | Promotional campaigns drive conversion and repeat sales. | Bagisto `Webkul/CartRule` | *"Add discount coupons (percentage vs fixed amount, minimum cart value, per-customer and total usage limits, expiry date) validated atomically within `place_order`."* |
| **Medium** | **Customer Reviews & Ratings** | Builds storefront social proof and buyer trust. | Bagisto `Webkul/Product` Reviews | *"Add verified-buyer product reviews and star ratings with vendor moderation controls and spam prevention."* |
| **Medium** | **Staff Email Invitations** | Vendors currently can only invite existing pre-registered user IDs. | Supabase Auth Invites | *"Implement `tenant_invitations` table with cryptographically secure token links, transactional invitation emails, and acceptance flow while enforcing plan `max_staff` limit."* |
| **Medium** | **Abandoned Cart Recovery & Transactional Emails** | Re-engages drop-offs and improves order completion rates. | Transactional Email Service | *"Track abandoned checkouts after 1 hour, add transactional emails for order placement, shipment tracking, and abandoned cart reminder sequences."* |
| **Medium** | **Storefront CMS & Custom Content Pages** | Allows merchants to publish About Us, Contact, FAQ, and policy pages. | Bagisto `Webkul/CMS` | *"Add `store_pages` table editable by merchants with sanitised markdown/rich-text, published dynamically under `/stores/[slug]/pages/[pageSlug]`."* |
| **Medium** | **Advanced Vendor Analytics** | Empowers merchants with sales insights and operational metrics. | Dashboard Analytics | *"Build vendor reporting charts for sales over time, average order value (AOV), top-selling products, and checkout conversion rate funnel."* |
| **Low** | **Storefront Themes & Color Tokens** | Visual differentiation between merchants. | Bagisto Velocity / Default Themes | *"Define 3 storefront theme templates (Modern Minimal, Vibrant Retail, Classic Boutique) selectable in vendor settings, persisting layout presets and brand tokens."* |
| **Low** | **Multi-Currency & Multi-Language (i18n)** | Cross-border retail expansion. | Bagisto `Webkul/Core` Locales | *"Add multi-currency conversion rates and multi-language dictionary support for vendor storefronts."* |
| **Low** | **Marketplace Aggregator Mode** | Central platform storefront showcasing products from all tenants. | Bagisto Multi-Vendor Marketplace | *"Optional global marketplace discovery page listing curated products across all tenants with platform commission calculation."* |
| **Low** | **Audit Log & Merchant Data Export** | Enterprise compliance and vendor portability. | Compliance & GDPR | *"Append-only `tenant_audit_logs` capturing critical settings and pricing changes; one-click CSV/ZIP export of store catalog, orders, and customer lists."* |
| **Low** | **PWA & Native Mobile Storefronts** | Mobile retail engagement. | Progressive Web App | *"Add Web App Manifest, offline service worker caching for storefronts, and install prompts; evaluate React Native / Expo shell."* |

---

## 3. Workflow for Running Any Backlog Item

To execute any item from this backlog:
```bash
# Example invocation
"Implement Backlog Item: Shipping & Delivery Charge Rules. Follow the workflow in docs/BACKLOG.md."
```

