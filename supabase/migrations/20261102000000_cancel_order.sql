-- =============================================================================
-- Migration: 20261102000000_cancel_order.sql
-- Description: Adds order_events audit table, cancel_order RPC with restock,
--              and update_order_status RPC enforcing state machine transitions.
-- =============================================================================

-- 1. Order Events table for timeline tracking
create table if not exists public.order_events (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  order_id    uuid not null references public.orders (id) on delete cascade,
  status      text not null,
  note        text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_order_events_order on public.order_events (order_id, created_at asc);
create index if not exists idx_order_events_tenant on public.order_events (tenant_id);

alter table public.order_events enable row level security;

-- Members of the tenant can read events
create policy order_events_member_select on public.order_events
  for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

-- Customers can view events for their own orders
create policy order_events_customer_select on public.order_events
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = order_events.order_id and c.user_id = auth.uid()
    )
  );

-- Members can insert events
create policy order_events_member_insert on public.order_events
  for insert to authenticated
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

-- -----------------------------------------------------------------------------
-- 2. cancel_order: Cancels order and restocks inventory
-- -----------------------------------------------------------------------------
create or replace function public.cancel_order(
  p_order   uuid,
  p_reason  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid         uuid := auth.uid();
  v_order     public.orders%rowtype;
  v_is_owner  boolean := false;
  v_is_member boolean := false;
  rec         record;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Lock the order row
  select * into v_order
    from public.orders
   where id = p_order
     for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  -- Verify permissions:
  -- Customer who owns the order:
  select exists (
    select 1
      from public.customers c
     where c.id = v_order.customer_id
       and c.user_id = uid
  ) into v_is_owner;

  -- Or tenant member:
  select public.is_tenant_member(v_order.tenant_id, array['owner', 'admin', 'staff']) into v_is_member;

  if not v_is_owner and not v_is_member then
    raise exception 'FORBIDDEN';
  end if;

  -- Customer can only cancel while status = 'pending'
  if v_is_owner and not v_is_member and v_order.status <> 'pending' then
    raise exception 'FORBIDDEN: customers can only cancel pending orders';
  end if;

  -- Vendor member can cancel while status in ('pending', 'confirmed')
  if v_is_member and v_order.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATE: order cannot be cancelled in % state', v_order.status;
  end if;

  -- Must not already be cancelled, shipped, or delivered
  if v_order.status in ('cancelled', 'shipped', 'delivered') then
    raise exception 'INVALID_STATE: cannot cancel an order that is already %', v_order.status;
  end if;

  -- Restock products that track inventory
  for rec in
    select oi.product_id, oi.quantity, p.track_inventory
      from public.order_items oi
      left join public.products p on p.id = oi.product_id
     where oi.order_id = p_order
  loop
    if rec.product_id is not null and coalesce(rec.track_inventory, false) is true then
      update public.products
         set stock = stock + rec.quantity
       where id = rec.product_id;
    end if;
  end loop;

  -- Set status to cancelled (and payment_status = 'refunded' if it was 'paid')
  update public.orders
     set status = 'cancelled',
         payment_status = case when payment_status = 'paid' then 'refunded' else payment_status end,
         notes = case
                   when p_reason is not null and length(trim(p_reason)) > 0 then
                     case when notes is not null and length(notes) > 0
                          then notes || E'\nCancellation reason: ' || trim(p_reason)
                          else 'Cancellation reason: ' || trim(p_reason)
                     end
                   else notes
                 end
   where id = p_order;

  -- Append audit event
  insert into public.order_events (tenant_id, order_id, status, note, created_by)
  values (
    v_order.tenant_id,
    p_order,
    'cancelled',
    coalesce(nullif(trim(p_reason), ''), case when v_is_owner then 'Cancelled by customer' else 'Cancelled by store staff' end),
    uid
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. update_order_status: Enforces state machine transitions
--    pending -> confirmed -> shipped -> delivered
-- -----------------------------------------------------------------------------
create or replace function public.update_order_status(
  p_order   uuid,
  p_status  text,
  p_note    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid      uuid := auth.uid();
  v_order  public.orders%rowtype;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Lock order row
  select * into v_order
    from public.orders
   where id = p_order
     for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  -- Only tenant staff/admins can change status
  if not public.is_tenant_member(v_order.tenant_id, array['owner', 'admin', 'staff']) then
    raise exception 'FORBIDDEN';
  end if;

  -- Cancellations must go through cancel_order (which handles restock)
  if p_status = 'cancelled' then
    raise exception 'INVALID_STATE: use cancel_order to cancel orders';
  end if;

  -- Enforce valid forward transitions
  if v_order.status = 'pending' and p_status = 'confirmed' then
    -- Allowed
  elsif v_order.status = 'confirmed' and p_status = 'shipped' then
    -- Allowed
  elsif v_order.status = 'shipped' and p_status = 'delivered' then
    -- Allowed
  else
    raise exception 'INVALID_STATE: transition from % to % is not allowed', v_order.status, p_status;
  end if;

  update public.orders
     set status = p_status
   where id = p_order;

  insert into public.order_events (tenant_id, order_id, status, note, created_by)
  values (
    v_order.tenant_id,
    p_order,
    p_status,
    p_note,
    uid
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. update_order_payment_status: Update payment state (e.g. Mark as Paid)
-- -----------------------------------------------------------------------------
create or replace function public.update_order_payment_status(
  p_order          uuid,
  p_payment_status text,
  p_note           text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid      uuid := auth.uid();
  v_order  public.orders%rowtype;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_payment_status not in ('pending', 'paid', 'refunded', 'failed') then
    raise exception 'INVALID_STATE: invalid payment status %', p_payment_status;
  end if;

  select * into v_order
    from public.orders
   where id = p_order
     for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if not public.is_tenant_member(v_order.tenant_id, array['owner', 'admin', 'staff']) then
    raise exception 'FORBIDDEN';
  end if;

  update public.orders
     set payment_status = p_payment_status
   where id = p_order;

  insert into public.order_events (tenant_id, order_id, status, note, created_by)
  values (
    v_order.tenant_id,
    p_order,
    v_order.status,
    coalesce(p_note, 'Payment status updated to ' || p_payment_status),
    uid
  );
end;
$$;

