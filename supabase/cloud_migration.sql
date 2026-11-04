-- =============================================================================
-- SaaS Commerce Platform: initial schema (Supabase / PostgreSQL 15+)
-- Multi-tenant (shared database, tenant_id + RLS), plans with limits,
-- subscriptions, catalog, orders, notifications, storage.
--
-- Run with:  supabase db reset      (local)    or    supabase db push   (remote)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper: updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Identity: profiles + platform (super) admins
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Super admins live in their own table (never a flag users can edit).
-- Add one with:  insert into platform_admins (user_id) select id from auth.users where email = 'you@example.com';
create table if not exists public.platform_admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Plans (managed by super admin). NULL limit = unlimited.
-- -----------------------------------------------------------------------------
create table if not exists public.plans (
  id                     uuid primary key default gen_random_uuid(),
  code                   text not null unique check (code ~ '^[a-z0-9_-]{2,40}$'),
  name                   text not null,
  description            text,
  billing_interval       text not null check (billing_interval in ('month', 'year')),
  price_paise            integer not null check (price_paise >= 0),   -- 49900 = Rs 499.00
  currency               text not null default 'INR',
  trial_days             integer not null default 0 check (trial_days >= 0),
  -- limits (enforced by database triggers below)
  max_products           integer check (max_products is null or max_products >= 0),
  max_staff              integer check (max_staff is null or max_staff >= 0),
  max_orders_per_month   integer check (max_orders_per_month is null or max_orders_per_month >= 0),
  custom_domain_allowed  boolean not null default false,
  features               jsonb not null default '[]'::jsonb,           -- marketing bullet list
  razorpay_plan_id       text,
  is_active              boolean not null default true,
  sort_order             integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Tenants (a vendor's store) + members
-- -----------------------------------------------------------------------------
create table if not exists public.tenants (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique
                   check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name           text not null,
  owner_id       uuid not null references auth.users (id) on delete restrict,
  status         text not null default 'active' check (status in ('active', 'suspended')),
  custom_domain  text unique,
  logo_url       text,
  -- storefront theme/branding. PUBLIC: never store secrets here.
  settings       jsonb not null default '{}'::jsonb,
  order_seq      bigint not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists tenants_owner_idx on public.tenants (owner_id);

create trigger tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

create table if not exists public.tenant_members (
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('owner', 'admin', 'staff')),
  created_at  timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists tenant_members_user_idx on public.tenant_members (user_id);

-- -----------------------------------------------------------------------------
-- 5. Subscriptions + payment records (written by server/webhooks only)
-- -----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references public.tenants (id) on delete cascade,
  plan_id                   uuid not null references public.plans (id) on delete restrict,
  status                    text not null
                              check (status in ('incomplete', 'trialing', 'active', 'past_due', 'cancelled', 'expired')),
  trial_ends_at             timestamptz,
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  cancel_at_period_end      boolean not null default false,
  razorpay_subscription_id  text unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Only one live subscription per tenant.
create unique index if not exists subscriptions_one_live_per_tenant
  on public.subscriptions (tenant_id)
  where status in ('incomplete', 'trialing', 'active', 'past_due');

create index if not exists subscriptions_tenant_idx on public.subscriptions (tenant_id);

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table if not exists public.subscription_payments (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants (id) on delete cascade,
  subscription_id       uuid references public.subscriptions (id) on delete set null,
  amount_paise          integer not null check (amount_paise >= 0),
  currency              text not null default 'INR',
  status                text not null check (status in ('created', 'paid', 'failed', 'refunded')),
  razorpay_payment_id   text unique,
  razorpay_order_id     text,
  created_at            timestamptz not null default now()
);

create index if not exists subscription_payments_tenant_idx on public.subscription_payments (tenant_id);

-- -----------------------------------------------------------------------------
-- 6. Access helper functions
-- -----------------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create or replace function public.is_tenant_member(p_tenant uuid, p_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_members m
    where m.tenant_id = p_tenant
      and m.user_id = auth.uid()
      and (p_roles is null or m.role = any (p_roles))
  );
$$;

-- The live plan + limits for a tenant. Returns NO ROWS when the tenant has no
-- valid subscription (expired trial, unpaid, cancelled...). past_due gets 3 days grace.
create or replace function public.tenant_entitlements(p_tenant uuid)
returns table (
  subscription_id        uuid,
  plan_id                uuid,
  plan_name              text,
  status                 text,
  max_products           integer,
  max_staff              integer,
  max_orders_per_month   integer,
  custom_domain_allowed  boolean,
  period_end             timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, p.id, p.name, s.status,
         p.max_products, p.max_staff, p.max_orders_per_month, p.custom_domain_allowed,
         coalesce(s.current_period_end, s.trial_ends_at)
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.tenant_id = p_tenant
    and s.status in ('trialing', 'active', 'past_due')
    and case s.status
          when 'trialing' then s.trial_ends_at > now()
          when 'active'   then s.current_period_end > now()
          else s.current_period_end + interval '3 days' > now()
        end
  order by s.created_at desc
  limit 1;
$$;

-- Internal only: used by triggers/RPCs (which run as owner), not callable from the API.
revoke execute on function public.tenant_entitlements(uuid) from public, anon, authenticated;

-- A store is "open" when active AND its subscription is valid.
create or replace function public.tenant_is_open(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.tenants t where t.id = p_tenant and t.status = 'active')
     and exists (select 1 from public.tenant_entitlements(p_tenant));
$$;

-- -----------------------------------------------------------------------------
-- 7. Catalog
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  parent_id   uuid,
  name        text not null,
  slug        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, tenant_id),
  unique (tenant_id, slug),
  -- parent must belong to the same tenant
  foreign key (parent_id, tenant_id) references public.categories (id, tenant_id)
    on delete set null (parent_id)
);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create table if not exists public.products (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id) on delete cascade,
  category_id        uuid,
  name               text not null,
  slug               text not null,
  description        text,
  price              numeric(12, 2) not null check (price >= 0),
  compare_at_price   numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  sku                text,
  stock              integer not null default 0 check (stock >= 0),
  track_inventory    boolean not null default true,
  status             text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (id, tenant_id),
  unique (tenant_id, slug),
  -- category must belong to the same tenant
  foreign key (category_id, tenant_id) references public.categories (id, tenant_id)
    on delete set null (category_id)
);

create unique index if not exists products_tenant_sku_uniq on public.products (tenant_id, sku) where sku is not null;
create index if not exists products_tenant_status_idx on public.products (tenant_id, status);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  product_id  uuid not null,
  url         text not null,
  alt         text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  foreign key (product_id, tenant_id) references public.products (id, tenant_id) on delete cascade
);

create index if not exists product_images_product_idx on public.product_images (product_id, position);

-- -----------------------------------------------------------------------------
-- 8. Storefront customers + orders
-- -----------------------------------------------------------------------------
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  name        text not null,
  email       text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, tenant_id),
  unique (tenant_id, user_id)
);

create trigger customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  customer_id       uuid,
  order_number      text not null,
  status            text not null default 'pending'
                      check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status    text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  payment_method    text not null default 'cod',
  subtotal          numeric(12, 2) not null default 0 check (subtotal >= 0),
  shipping_amount   numeric(12, 2) not null default 0 check (shipping_amount >= 0),
  total             numeric(12, 2) not null default 0 check (total >= 0),
  shipping_address  jsonb not null default '{}'::jsonb,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, tenant_id),
  unique (tenant_id, order_number),
  foreign key (customer_id, tenant_id) references public.customers (id, tenant_id)
    on delete set null (customer_id)
);

create index if not exists orders_tenant_created_idx on public.orders (tenant_id, created_at desc);
create index if not exists orders_customer_idx on public.orders (customer_id);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Per-tenant sequential order numbers: ORD-000001, ORD-000002 ...
create or replace function public.assign_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  update public.tenants
     set order_seq = order_seq + 1
   where id = new.tenant_id
   returning order_seq into n;
  new.order_number := 'ORD-' || lpad(n::text, 6, '0');
  return new;
end;
$$;

create trigger orders_assign_number
  before insert on public.orders
  for each row execute function public.assign_order_number();

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  order_id    uuid not null,
  product_id  uuid,
  name        text not null,          -- snapshot at purchase time
  sku         text,
  unit_price  numeric(12, 2) not null check (unit_price >= 0),
  quantity    integer not null check (quantity > 0),
  line_total  numeric(12, 2) not null check (line_total >= 0),
  foreign key (order_id, tenant_id) references public.orders (id, tenant_id) on delete cascade,
  foreign key (product_id, tenant_id) references public.products (id, tenant_id)
    on delete set null (product_id)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- -----------------------------------------------------------------------------
-- 9. Notifications (Firebase Cloud Messaging device tokens)
-- -----------------------------------------------------------------------------
create table if not exists public.notification_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  tenant_id     uuid references public.tenants (id) on delete cascade,
  token         text not null unique,
  platform      text not null default 'web' check (platform in ('web', 'android', 'ios')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index if not exists notification_tokens_user_idx on public.notification_tokens (user_id);
create index if not exists notification_tokens_tenant_idx on public.notification_tokens (tenant_id);

-- -----------------------------------------------------------------------------
-- 10. Plan-limit enforcement (database level, cannot be bypassed from the client)
-- -----------------------------------------------------------------------------

-- 10a. Products: block when subscription invalid or max_products reached.
create or replace function public.enforce_product_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ent  record;
  cnt  integer;
begin
  -- Only count when a product becomes (or is created as) non-archived.
  if tg_op = 'UPDATE' then
    if not (old.status = 'archived' and new.status <> 'archived') then
      return new;
    end if;
  elsif new.status = 'archived' then
    return new;
  end if;

  -- BEFORE triggers fire ahead of RLS. For API callers who are not members, stay
  -- silent here and let RLS reject the write (so we never leak plan details).
  -- auth.uid() is NULL for service-role / server-side calls, which are always checked.
  if auth.uid() is not null
     and not public.is_tenant_member(new.tenant_id, array['owner', 'admin', 'staff']) then
    return new;
  end if;

  -- Serialise concurrent inserts for the same tenant.
  perform 1 from public.tenants where id = new.tenant_id for update;

  select * into ent from public.tenant_entitlements(new.tenant_id);
  if not found then
    raise exception 'SUBSCRIPTION_INACTIVE: your subscription is not active';
  end if;

  if ent.max_products is not null then
    select count(*) into cnt
      from public.products
     where tenant_id = new.tenant_id
       and status <> 'archived'
       and id <> new.id;
    if cnt >= ent.max_products then
      raise exception 'PLAN_LIMIT_PRODUCTS: your plan allows % products', ent.max_products;
    end if;
  end if;

  return new;
end;
$$;

create trigger products_enforce_limit
  before insert or update of status on public.products
  for each row execute function public.enforce_product_limit();

-- 10b. Staff: owner is free, admins/staff count toward max_staff.
create or replace function public.enforce_staff_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ent  record;
  cnt  integer;
begin
  if new.role = 'owner' then
    return new;
  end if;

  -- Let RLS reject non-admins first (BEFORE triggers run ahead of RLS).
  if auth.uid() is not null
     and not public.is_tenant_member(new.tenant_id, array['owner', 'admin']) then
    return new;
  end if;

  perform 1 from public.tenants where id = new.tenant_id for update;

  select * into ent from public.tenant_entitlements(new.tenant_id);
  if not found then
    raise exception 'SUBSCRIPTION_INACTIVE: your subscription is not active';
  end if;

  if ent.max_staff is not null then
    select count(*) into cnt
      from public.tenant_members
     where tenant_id = new.tenant_id
       and role <> 'owner';
    if cnt >= ent.max_staff then
      raise exception 'PLAN_LIMIT_STAFF: your plan allows % team members', ent.max_staff;
    end if;
  end if;

  return new;
end;
$$;

create trigger tenant_members_enforce_limit
  before insert on public.tenant_members
  for each row execute function public.enforce_staff_limit();

-- 10c. Custom domain only on plans that allow it.
create or replace function public.enforce_custom_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ent record;
begin
  if new.custom_domain is not null and new.custom_domain is distinct from old.custom_domain then
    select * into ent from public.tenant_entitlements(new.id);
    if not found or not ent.custom_domain_allowed then
      raise exception 'PLAN_LIMIT_DOMAIN: custom domains are not included in your plan';
    end if;
  end if;
  return new;
end;
$$;

create trigger tenants_enforce_custom_domain
  before update of custom_domain on public.tenants
  for each row execute function public.enforce_custom_domain();

-- -----------------------------------------------------------------------------
-- 11. RPCs
-- -----------------------------------------------------------------------------

-- 11a. Vendor onboarding: create store + owner membership + subscription in one transaction.
create or replace function public.create_tenant(p_name text, p_slug text, p_plan_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid       uuid := auth.uid();
  v_slug    text := lower(trim(p_slug));
  v_plan    public.plans;
  v_tenant  uuid;
  v_owned   integer;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'INVALID_NAME';
  end if;

  if v_slug !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then
    raise exception 'INVALID_SLUG: use 3-40 lowercase letters, numbers or hyphens';
  end if;

  if v_slug = any (array[
    'www','app','admin','api','dashboard','super-admin','static','assets','mail',
    'support','help','blog','docs','status','login','signup','stores','pricing'
  ]) then
    raise exception 'RESERVED_SLUG';
  end if;

  select count(*) into v_owned from public.tenants where owner_id = uid;
  if v_owned >= 5 then
    raise exception 'TENANT_LIMIT: maximum 5 stores per account';
  end if;

  select * into v_plan from public.plans where code = p_plan_code and is_active;
  if not found then
    raise exception 'PLAN_NOT_FOUND';
  end if;

  insert into public.tenants (slug, name, owner_id)
  values (v_slug, trim(p_name), uid)
  returning id into v_tenant;                 -- unique_violation (23505) if slug taken

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant, uid, 'owner');

  if v_plan.trial_days > 0 then
    insert into public.subscriptions (tenant_id, plan_id, status, trial_ends_at)
    values (v_tenant, v_plan.id, 'trialing', now() + make_interval(days => v_plan.trial_days));
  elsif v_plan.price_paise = 0 then
    insert into public.subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
    values (v_tenant, v_plan.id, 'active', now(), now() + interval '100 years');
  else
    -- Paid plan without trial: store exists but is locked until payment webhook activates it.
    insert into public.subscriptions (tenant_id, plan_id, status)
    values (v_tenant, v_plan.id, 'incomplete');
  end if;

  return v_tenant;
end;
$$;

-- 11b. Storefront: resolve a store by slug or custom domain with PUBLIC fields only.
create or replace function public.storefront_tenant(p_slug text default null, p_domain text default null)
returns table (
  id        uuid,
  slug      text,
  name      text,
  logo_url  text,
  settings  jsonb,
  is_open   boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.slug, t.name, t.logo_url, t.settings, public.tenant_is_open(t.id)
  from public.tenants t
  where t.status = 'active'
    and (
      (p_slug   is not null and t.slug = lower(p_slug)) or
      (p_domain is not null and t.custom_domain = lower(p_domain))
    )
  limit 1;
$$;

-- 11c. Dashboard usage meter: plan + limits + current usage, members only.
create or replace function public.tenant_usage(p_tenant uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ent record;
  v_products integer;
  v_staff integer;
  v_orders integer;
begin
  if not (public.is_tenant_member(p_tenant) or public.is_platform_admin()) then
    raise exception 'FORBIDDEN';
  end if;

  select count(*) into v_products from public.products where tenant_id = p_tenant and status <> 'archived';
  select count(*) into v_staff    from public.tenant_members where tenant_id = p_tenant and role <> 'owner';
  select count(*) into v_orders   from public.orders
   where tenant_id = p_tenant and created_at >= date_trunc('month', now());

  select * into ent from public.tenant_entitlements(p_tenant);

  if not found then
    return jsonb_build_object(
      'active', false,
      'usage', jsonb_build_object('products', v_products, 'staff', v_staff, 'orders_this_month', v_orders)
    );
  end if;

  return jsonb_build_object(
    'active', true,
    'plan_name', ent.plan_name,
    'status', ent.status,
    'period_end', ent.period_end,
    'limits', jsonb_build_object(
      'products', ent.max_products,
      'staff', ent.max_staff,
      'orders_per_month', ent.max_orders_per_month,
      'custom_domain', ent.custom_domain_allowed
    ),
    'usage', jsonb_build_object('products', v_products, 'staff', v_staff, 'orders_this_month', v_orders)
  );
end;
$$;

-- 11d. Super admin: suspend / reactivate a store.
create or replace function public.admin_set_tenant_status(p_tenant uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('active', 'suspended') then
    raise exception 'INVALID_STATUS';
  end if;
  update public.tenants set status = p_status where id = p_tenant;
end;
$$;

-- 11e. Checkout: validates prices/stock server-side, enforces monthly order limit.
--      p_items = [{"product_id": "<uuid>", "quantity": 2}, ...]
create or replace function public.place_order(
  p_tenant    uuid,
  p_items     jsonb,
  p_shipping  jsonb,
  p_notes     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid         uuid := auth.uid();
  v_tenant    public.tenants;
  ent         record;
  v_customer  uuid;
  v_order     uuid;
  v_subtotal  numeric(12, 2) := 0;
  v_month_cnt integer;
  rec         record;
  prod        public.products;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- Lock the tenant row: serialises order numbers and the monthly limit check.
  select * into v_tenant from public.tenants where id = p_tenant and status = 'active' for update;
  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;

  select * into ent from public.tenant_entitlements(p_tenant);
  if not found then
    raise exception 'STORE_UNAVAILABLE';
  end if;

  if ent.max_orders_per_month is not null then
    select count(*) into v_month_cnt
      from public.orders
     where tenant_id = p_tenant
       and created_at >= date_trunc('month', now());
    if v_month_cnt >= ent.max_orders_per_month then
      raise exception 'PLAN_LIMIT_ORDERS: this store cannot accept more orders this month';
    end if;
  end if;

  insert into public.customers (tenant_id, user_id, name, email, phone)
  select p_tenant, uid,
         coalesce(nullif(p_shipping ->> 'name', ''), pr.full_name, 'Customer'),
         u.email,
         p_shipping ->> 'phone'
    from auth.users u
    left join public.profiles pr on pr.id = u.id
   where u.id = uid
  on conflict (tenant_id, user_id) do update
     set name  = excluded.name,
         phone = coalesce(excluded.phone, public.customers.phone)
  returning id into v_customer;

  insert into public.orders (tenant_id, customer_id, shipping_address, notes)
  values (p_tenant, v_customer, coalesce(p_shipping, '{}'::jsonb), p_notes)
  returning id into v_order;

  -- Group duplicate lines and lock products in a stable order (avoids deadlocks).
  for rec in
    select (e ->> 'product_id')::uuid as product_id,
           sum((e ->> 'quantity')::integer) as qty
      from jsonb_array_elements(p_items) e
     group by 1
     order by 1
  loop
    if rec.product_id is null or rec.qty is null or rec.qty < 1 or rec.qty > 100 then
      raise exception 'INVALID_ITEM';
    end if;

    select * into prod
      from public.products
     where id = rec.product_id
       and tenant_id = p_tenant
       and status = 'active'
     for update;

    if not found then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;

    if prod.track_inventory then
      if prod.stock < rec.qty then
        raise exception 'OUT_OF_STOCK: %', prod.name;
      end if;
      update public.products set stock = stock - rec.qty::integer where id = prod.id;
    end if;

    insert into public.order_items (tenant_id, order_id, product_id, name, sku, unit_price, quantity, line_total)
    values (p_tenant, v_order, prod.id, prod.name, prod.sku, prod.price, rec.qty::integer, prod.price * rec.qty);

    v_subtotal := v_subtotal + prod.price * rec.qty;
  end loop;

  update public.orders
     set subtotal = v_subtotal,
         total    = v_subtotal + shipping_amount
   where id = v_order;

  return v_order;
end;
$$;

-- -----------------------------------------------------------------------------
-- 12. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.platform_admins        enable row level security;
alter table public.plans                  enable row level security;
alter table public.tenants                enable row level security;
alter table public.tenant_members         enable row level security;
alter table public.subscriptions          enable row level security;
alter table public.subscription_payments  enable row level security;
alter table public.categories             enable row level security;
alter table public.products               enable row level security;
alter table public.product_images         enable row level security;
alter table public.customers              enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.notification_tokens    enable row level security;

-- platform_admins: no policies at all (only service role / security-definer functions touch it).

-- profiles
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_platform_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- plans: public pricing page reads active plans; super admin manages everything.
create policy plans_select on public.plans
  for select to anon, authenticated
  using (is_active or public.is_platform_admin());

create policy plans_admin_insert on public.plans
  for insert to authenticated
  with check (public.is_platform_admin());

create policy plans_admin_update on public.plans
  for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy plans_admin_delete on public.plans
  for delete to authenticated
  using (public.is_platform_admin());

-- tenants: created only through create_tenant(); members read; owner/admin update safe columns.
create policy tenants_select on public.tenants
  for select to authenticated
  using (public.is_tenant_member(id) or public.is_platform_admin());

create policy tenants_update on public.tenants
  for update to authenticated
  using (public.is_tenant_member(id, array['owner', 'admin']))
  with check (public.is_tenant_member(id, array['owner', 'admin']));

-- Column-level safety: members can only edit these columns directly.
revoke update on public.tenants from anon, authenticated;
grant update (name, logo_url, settings, custom_domain) on public.tenants to authenticated;

-- tenant_members
create policy tenant_members_select on public.tenant_members
  for select to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_platform_admin());

create policy tenant_members_insert on public.tenant_members
  for insert to authenticated
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin']) and role in ('admin', 'staff'));

create policy tenant_members_update on public.tenant_members
  for update to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']) and role <> 'owner')
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin']) and role in ('admin', 'staff'));

create policy tenant_members_delete on public.tenant_members
  for delete to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']) and role <> 'owner');

-- subscriptions + payments: read-only for members; writes via service role (webhooks).
create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_platform_admin());

create policy subscription_payments_select on public.subscription_payments
  for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']) or public.is_platform_admin());

-- categories
create policy categories_public_read on public.categories
  for select to anon, authenticated
  using (public.tenant_is_open(tenant_id));

create policy categories_member_all on public.categories
  for all to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

-- products
create policy products_public_read on public.products
  for select to anon, authenticated
  using (status = 'active' and public.tenant_is_open(tenant_id));

create policy products_member_all on public.products
  for all to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

-- product images
create policy product_images_public_read on public.product_images
  for select to anon, authenticated
  using (
    public.tenant_is_open(tenant_id)
    and exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
  );

create policy product_images_member_all on public.product_images
  for all to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

-- customers: created by place_order(); a customer sees/edits only their own row.
create policy customers_select on public.customers
  for select to authenticated
  using (user_id = auth.uid() or public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy customers_update_own on public.customers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- orders: created only by place_order(); customers read their own; staff manage.
create policy orders_select on public.orders
  for select to authenticated
  using (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    or exists (select 1 from public.customers c where c.id = customer_id and c.user_id = auth.uid())
  );

create policy orders_member_update on public.orders
  for update to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy order_items_select on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));

-- notification tokens: own rows only
create policy notification_tokens_own on public.notification_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 13. Storage: product images. Path convention: <tenant_id>/<product_id>/<file>
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images public read" on storage.objects
  for select
  using (bucket_id = 'product-images');

create policy "product images member insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.is_tenant_member(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'staff'])
  );

create policy "product images member update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_tenant_member(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'staff'])
  );

create policy "product images member delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_tenant_member(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'staff'])
  );


-- =============================================================================
-- Seed Data: Starter, Growth, and Pro Plans
-- =============================================================================

-- =============================================================================
-- Seed data: example plans (edit freely, or manage them from the Super Admin UI)
-- Prices are in paise: 49900 = Rs 499.00
-- NULL limit = unlimited
-- =============================================================================

insert into public.plans
  (code, name, description, billing_interval, price_paise, trial_days,
   max_products, max_staff, max_orders_per_month, custom_domain_allowed, features, sort_order)
values
  ('starter-monthly', 'Starter', 'For new sellers getting started', 'month', 49900, 14,
   30, 1, 100, false,
   '["Up to 30 products","1 team member","100 orders / month","Free subdomain"]'::jsonb, 10),

  ('starter-yearly', 'Starter (Yearly)', 'Starter, billed yearly: 2 months free', 'year', 499000, 14,
   30, 1, 100, false,
   '["Up to 30 products","1 team member","100 orders / month","Free subdomain","2 months free"]'::jsonb, 11),

  ('growth-monthly', 'Growth', 'For growing stores', 'month', 149900, 14,
   200, 3, 1000, false,
   '["Up to 200 products","3 team members","1,000 orders / month","Free subdomain"]'::jsonb, 20),

  ('growth-yearly', 'Growth (Yearly)', 'Growth, billed yearly: 2 months free', 'year', 1499000, 14,
   200, 3, 1000, false,
   '["Up to 200 products","3 team members","1,000 orders / month","Free subdomain","2 months free"]'::jsonb, 21),

  ('pro-monthly', 'Pro', 'For established brands', 'month', 399900, 14,
   null, 10, null, true,
   '["Unlimited products","10 team members","Unlimited orders","Custom domain","Priority support"]'::jsonb, 30),

  ('pro-yearly', 'Pro (Yearly)', 'Pro, billed yearly: 2 months free', 'year', 3999000, 14,
   null, 10, null, true,
   '["Unlimited products","10 team members","Unlimited orders","Custom domain","Priority support","2 months free"]'::jsonb, 31)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Make yourself the first Super Admin (sign up in the app first, then run):
--
--   insert into public.platform_admins (user_id)
--   select id from auth.users where email = 'you@example.com';
-- -----------------------------------------------------------------------------



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

  -- Must not already be cancelled, shipped, or delivered
  if v_order.status in ('cancelled', 'shipped', 'delivered') then
    raise exception 'INVALID_STATE: cannot cancel an order that is already %', v_order.status;
  end if;

  -- Customer can only cancel while status = 'pending'
  if v_is_owner and not v_is_member and v_order.status <> 'pending' then
    raise exception 'FORBIDDEN: customers can only cancel pending orders';
  end if;

  -- Vendor member can cancel while status in ('pending', 'confirmed')
  if v_is_member and v_order.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATE: order cannot be cancelled in % state', v_order.status;
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


-- =============================================================================
-- Migration: 20261103000000_notifications.sql
-- Goal: In-app notifications table and FCM push integration
-- =============================================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references public.tenants (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_tenant_idx
  on public.notifications (tenant_id);

create index if not exists notifications_tenant_type_idx
  on public.notifications (tenant_id, type, created_at desc);

alter table public.notifications enable row level security;

grant select on public.notifications to authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- =============================================================================
-- Migration: 20261104000000_rate_limiting.sql
-- Goal: PostgreSQL-backed sliding-window rate limiting for auth, orders, and slugs
-- =============================================================================

create table if not exists public.rate_limit_buckets (
  key         text primary key,
  count       int not null default 1,
  reset_at    timestamptz not null
);

create index if not exists rate_limit_buckets_reset_idx
  on public.rate_limit_buckets (reset_at);

alter table public.rate_limit_buckets enable row level security;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket public.rate_limit_buckets;
  v_now timestamptz := now();
begin
  delete from public.rate_limit_buckets
   where key = p_key
     and reset_at <= v_now;

  insert into public.rate_limit_buckets (key, count, reset_at)
  values (p_key, 1, v_now + (p_window_seconds || ' seconds')::interval)
  on conflict (key) do update
    set count = public.rate_limit_buckets.count + 1
  returning * into v_bucket;

  if v_bucket.count > p_limit then
    return false;
  end if;

  return true;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated, service_role;
