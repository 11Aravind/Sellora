# 09. Orders management (vendor) and cancellations

**Goal:** vendors process orders (confirm, ship, deliver, cancel with restock); customers can cancel pending orders.

## Prompt

```
Read docs/CONTEXT.md and the orders/order_items/products parts of the migration.

PART A: new migration (do NOT edit the old one)
Create supabase/migrations/20261102000000_cancel_order.sql with a SECURITY DEFINER function
`cancel_order(p_order uuid, p_reason text default null) returns void`, `set search_path = public`:
  - raise AUTH_REQUIRED if auth.uid() is null;
  - lock the order row FOR UPDATE; raise ORDER_NOT_FOUND if missing;
  - allowed callers: the customer who owns the order (customers.user_id = auth.uid()) only while status = 'pending',
    OR a tenant member with role owner/admin/staff while status in ('pending','confirmed'); otherwise raise FORBIDDEN;
  - status must not already be cancelled/shipped/delivered (raise INVALID_STATE);
  - restock: for each order_item with product_id not null and products.track_inventory = true, add quantity back;
  - set status = 'cancelled' (and payment_status = 'refunded' if it was 'paid');
  - append p_reason to orders.notes.
Also add `update_order_status(p_order uuid, p_status text)` for members that enforces the allowed transitions
pending -> confirmed -> shipped -> delivered (cancel goes through cancel_order), raising INVALID_STATE otherwise.
Then `supabase db reset`, regenerate types (pnpm db:types), and extend supabase/tests with cases for both functions
(customer cancel, other customer blocked, restock amounts, illegal transition).

PART B: vendor UI (src/app/dashboard/[tenant]/orders, src/features/orders)
1. Orders list: filter by status/payment status/date range, search by order number or customer name/phone,
   pagination, status badges, total.
2. Order detail: items with image/name/qty/unit price, customer + shipping address, timeline of status changes
   (add a lightweight `order_events` table in the new migration if you want history: id, tenant_id, order_id,
   status, note, created_by, created_at with RLS for members), buttons for the next valid status, "Mark as paid"
   (update payment_status via a member-only update), "Cancel order" with a reason dialog (calls cancel_order).
3. Printable packing slip / invoice view (/dashboard/[tenant]/orders/[id]/print) with print-friendly CSS and store details.
4. CSV export of the filtered orders list (server route, members only).
5. Dashboard Overview from prompt 07 now shows real order stats.

PART C: customer UI
- On /stores/[slug]/orders/[id]: "Cancel order" button visible only while pending, calls cancel_order.

Run lint, typecheck, build and the SQL tests.
```

## Manual check
- [ ] Cancel a pending order -> product stock goes back up
- [ ] Customer cannot cancel after the vendor marks it shipped
- [ ] Skipping a status (pending -> delivered) is rejected
- [ ] Another vendor cannot change this order (404/forbidden)
