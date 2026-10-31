# 08. Customer storefront, cart and checkout

**Goal:** customers browse a vendor's store on `{slug}.yourdomain.com`, add to cart and place an order (cash on delivery for now).

## Prompt

```
Read docs/CONTEXT.md. Everything below lives under src/app/stores/[slug] and src/features/storefront.
The tenant is resolved by the layout from prompt 04 (rpc storefront_tenant).

1. Theming: apply tenants.settings (primaryColor, tagline, bannerUrl, logo) via CSS variables on the store layout.
2. Pages (Server Components, mobile first):
   - Home: banner, categories strip, "New arrivals" (latest 12 active products).
   - /products: grid with search (?q=), category filter (?category=slug), sort (newest, price asc/desc), pagination.
   - /products/[productSlug]: image gallery, price with compare-at strike-through, stock state, quantity selector,
     "Add to cart", description (escaped text), JSON-LD Product schema, metadata (title, description, OG image).
   - /cart, /checkout, /orders, /orders/[id] (confirmation + detail), /login and /signup for customers (reuse auth actions,
     redirect back to `next`).
   Public pages read through the ANON Supabase client; RLS only exposes active products of open stores.
3. Cart: no new dependency. A React context + localStorage keyed `cart:{tenantId}` storing only
   [{ productId, quantity }]. On /cart and /checkout re-fetch current prices/stock from the DB for those ids;
   show warnings for items that became unavailable or have less stock. Never trust stored prices.
   Header cart badge with item count; handle SSR hydration safely.
4. Checkout (requires login; unauthenticated customers are sent to /login?next=/checkout):
   - form: full name, phone, address line 1/2, city, state, PIN code (6 digits), notes (Zod);
     payment method: "Cash on delivery" only (display clearly; online payments are a later backlog item);
   - Server Action calls rpc `place_order(p_tenant, p_items, p_shipping, p_notes)` with
     p_items = [{ product_id, quantity }]. Do NOT send prices.
   - Map errors: OUT_OF_STOCK (show product name), PRODUCT_UNAVAILABLE (remove it from cart), PLAN_LIMIT_ORDERS /
     STORE_UNAVAILABLE ("This store can't accept orders right now"), EMPTY_CART, AUTH_REQUIRED.
   - Success: clear the cart, redirect to /orders/{id}?placed=1 with a confirmation view.
   - Prevent double submission (disabled button + a client-generated idempotency key stored in sessionStorage to avoid re-submitting after a refresh).
5. Customer order history: list and detail via the authenticated client (RLS returns only the customer's own orders).
6. Performance: use revalidate + cache tags per tenant (e.g. `tenant:{id}:products`) for public listings; call
   revalidateTag from the vendor product actions (prompt 07) when products/categories change. Avoid fetching with
   cookies on public pages so they can be cached.
7. SEO: sitemap.xml and robots.txt per store host (generate from active products), canonical URLs using the current host.
8. Accessibility: keyboard navigable gallery, alt text, labelled form controls, visible focus.

Run lint, typecheck, build.
```

## Manual check
- [ ] Browse `shop-a.localhost:3000`, add 2 items, sign up as a customer, place the order
- [ ] In Studio: stock decreased, `orders.total` equals the sum, `order_number` is `ORD-000001`
- [ ] Tamper with localStorage prices -> order total is still correct
- [ ] Quantity above stock -> friendly "out of stock" message, nothing created
- [ ] Customer B cannot open Customer A's `/orders/{id}`
- [ ] Draft/archived products never appear and their direct URLs return 404
