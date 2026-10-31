-- Behavioural tests for RLS, plan limits and checkout.
-- Run on a LOCAL Supabase DB only (it inserts fake users):
--   supabase db reset && psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" -f supabase/tests/rls_and_limits.test.sql
-- Prints 'ALL TESTS PASSED' at the end. Tests ran green against PostgreSQL 16.
create schema t;
grant usage on schema t to anon, authenticated;
create function t.expect_fail(q text, pat text) returns void language plpgsql as $$
begin
  begin execute q;
  exception when others then
    if sqlerrm ~* pat then raise notice 'PASS (blocked: %) %', pat, left(sqlerrm, 70); return; end if;
    raise exception 'WRONG ERROR for [%]: %', q, sqlerrm;
  end;
  raise exception 'EXPECTED FAILURE but succeeded: %', q;
end $$;
create function t.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, true); end $$;

insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','a@x.com'),
 ('00000000-0000-0000-0000-00000000000b','b@x.com'),
 ('00000000-0000-0000-0000-00000000000c','c@x.com'),
 ('00000000-0000-0000-0000-00000000000d','admin@x.com');
insert into public.platform_admins values ('00000000-0000-0000-0000-00000000000d');

do $$
declare a text := '00000000-0000-0000-0000-00000000000a'; b text := '00000000-0000-0000-0000-00000000000b';
        c text := '00000000-0000-0000-0000-00000000000c'; adm text := '00000000-0000-0000-0000-00000000000d';
        ta uuid; tc uuid; i int; n int; oid uuid; p1 uuid; p2 uuid; tot numeric; stk int;
begin
  -- vendor A creates store on Starter (30 products)
  perform t.as_user(a); set local role authenticated;
  ta := public.create_tenant('Shop A','Shop-A','starter-monthly');
  raise notice 'PASS create_tenant -> %', ta;
  perform t.expect_fail($q$select public.create_tenant('Xx','shop-a','starter-monthly')$q$, 'duplicate|unique');
  perform t.expect_fail($q$select public.create_tenant('Xx','admin','starter-monthly')$q$, 'RESERVED_SLUG');

  for i in 1..30 loop
    insert into public.products (tenant_id, name, slug, price, stock, status) values (ta, 'P'||i, 'p'||i, 100+i, 10, 'active');
  end loop;
  raise notice 'PASS 30 products inserted';
  perform t.expect_fail(format($q$insert into public.products (tenant_id,name,slug,price,status) values (%L,'P31','p31',1,'active')$q$, ta), 'PLAN_LIMIT_PRODUCTS');
  -- draft also counts (non-archived)
  perform t.expect_fail(format($q$insert into public.products (tenant_id,name,slug,price,status) values (%L,'P32','p32',1,'draft')$q$, ta), 'PLAN_LIMIT_PRODUCTS');
  -- archive one -> frees a slot
  update public.products set status='archived' where tenant_id=ta and slug='p30';
  insert into public.products (tenant_id,name,slug,price,status) values (ta,'P31','p31',1,'active');
  raise notice 'PASS archive frees slot';
  perform t.expect_fail(format($q$update public.products set status='active' where tenant_id=%L and slug='p30'$q$, ta), 'PLAN_LIMIT_PRODUCTS');

  -- column-level protection
  perform t.expect_fail(format($q$update public.tenants set status='suspended' where id=%L$q$, ta), 'permission denied');
  perform t.expect_fail(format($q$update public.tenants set owner_id=%L where id=%L$q$, b, ta), 'permission denied');
  perform t.expect_fail(format($q$update public.tenants set custom_domain='shop.example.com' where id=%L$q$, ta), 'PLAN_LIMIT_DOMAIN');
  perform t.expect_fail(format($q$insert into public.subscriptions (tenant_id,plan_id,status) select %L, id, 'active' from public.plans limit 1$q$, ta), 'row-level security|permission');
  perform t.expect_fail($q$insert into public.platform_admins values ('00000000-0000-0000-0000-00000000000a')$q$, 'row-level security|permission');
  perform t.expect_fail(format($q$select public.admin_set_tenant_status(%L,'suspended')$q$, ta), 'FORBIDDEN');
  perform t.expect_fail(format($q$insert into public.tenant_members values (%L,%L,'owner')$q$, ta, b), 'row-level security');
  perform t.expect_fail(format($q$select * from public.tenant_entitlements(%L)$q$, ta), 'permission denied');

  -- staff limit: starter allows 1
  insert into public.tenant_members values (ta, b::uuid, 'staff');
  perform t.expect_fail(format($q$insert into public.tenant_members values (%L,%L,'staff')$q$, ta, c), 'PLAN_LIMIT_STAFF');
  delete from public.tenant_members where tenant_id=ta and user_id=b::uuid;
  raise notice 'PASS staff limit';

  -- vendor C: separate store, cannot touch A
  perform t.as_user(c);
  tc := public.create_tenant('Shop C','shop-c','growth-monthly');
  select count(*) into n from public.products where tenant_id = ta;     -- active only visible publicly
  raise notice 'C sees % of A products (active only, public)', n;
  if n <> 30 then raise exception 'expected 30 active (29 + p31... check)'; end if;
  perform t.expect_fail(format($q$insert into public.products (tenant_id,name,slug,price) values (%L,'hack','hack',1)$q$, ta), 'row-level security');
  update public.products set price = 1 where tenant_id = ta;  -- should affect 0 rows
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'C updated A products!'; end if;
  raise notice 'PASS cross-tenant isolation';
  select count(*) into n from public.tenants; if n <> 1 then raise exception 'C sees % tenants', n; end if;

  -- customer B orders from A
  perform t.as_user(b);
  select id into p1 from public.products where tenant_id=ta and slug='p1';
  select id into p2 from public.products where tenant_id=ta and slug='p2';
  oid := public.place_order(ta, jsonb_build_array(jsonb_build_object('product_id',p1,'quantity',2), jsonb_build_object('product_id',p2,'quantity',1), jsonb_build_object('product_id',p1,'quantity',1)), '{"name":"Bob","phone":"999","city":"X"}'::jsonb);
  select total into tot from public.orders where id=oid;
  select stock into stk from public.products where id=p1;
  raise notice 'order total=% (expect 3*101 + 102 = 405), p1 stock=% (expect 7)', tot, stk;
  if tot <> 405 or stk <> 7 then raise exception 'ORDER MATH WRONG'; end if;
  perform t.expect_fail(format($q$select public.place_order(%L, '[{"product_id":"%s","quantity":50}]'::jsonb, '{}'::jsonb)$q$, ta, p1), 'OUT_OF_STOCK');
  perform t.expect_fail(format($q$insert into public.orders (tenant_id) values (%L)$q$, ta), 'row-level security');
  update public.orders set total=0 where id=oid; get diagnostics n = row_count; if n <> 0 then raise exception 'customer edited order!'; end if;
  select count(*) into n from public.order_items; if n <> 2 then raise exception 'B sees % items', n; end if;
  raise notice 'PASS place_order + customer sees own order';

  -- C (other vendor) cannot see B's order
  perform t.as_user(c);
  select count(*) into n from public.orders where tenant_id=ta; if n <> 0 then raise exception 'LEAK orders to other vendor'; end if;
  -- A sees it
  perform t.as_user(a);
  select count(*) into n from public.orders where tenant_id=ta; if n <> 1 then raise exception 'A cannot see order'; end if;
  raise notice 'PASS order visibility';
  raise notice 'USAGE: %', public.tenant_usage(ta);
  perform t.expect_fail(format($q$select public.tenant_usage(%L)$q$, tc), 'FORBIDDEN');

  -- anon storefront
  reset role; set local role anon; perform set_config('request.jwt.claim.sub','',true);
  select count(*) into n from public.products where tenant_id=ta; raise notice 'anon sees % products', n;
  if n <> 30 then raise exception 'anon product count wrong'; end if;
  select count(*) into n from public.orders; if n <> 0 then raise exception 'anon sees orders'; end if;
  select count(*) into n from public.plans; raise notice 'anon sees % plans', n;
  select count(*) into n from public.storefront_tenant('shop-a'); if n <> 1 then raise exception 'storefront_tenant failed'; end if;
  select count(*) into n from public.tenants; if n <> 0 then raise exception 'anon sees tenants'; end if;
  raise notice 'PASS anon';

  -- monthly order limit
  reset role; update public.plans set max_orders_per_month = 1 where code='starter-monthly';
  perform t.as_user(b); set local role authenticated;
  perform t.expect_fail(format($q$select public.place_order(%L, '[{"product_id":"%s","quantity":1}]'::jsonb, '{}'::jsonb)$q$, ta, p1), 'PLAN_LIMIT_ORDERS');

  -- expired trial locks the store
  reset role; update public.subscriptions set trial_ends_at = now() - interval '1 day' where tenant_id = ta;
  perform t.as_user(a); set local role authenticated;
  perform t.expect_fail(format($q$insert into public.products (tenant_id,name,slug,price,status) values (%L,'late','late',1,'draft')$q$, ta), 'SUBSCRIPTION_INACTIVE');
  reset role; set local role anon;
  select count(*) into n from public.products where tenant_id=ta; if n <> 0 then raise exception 'expired store still visible'; end if;
  select is_open into strict n from (select (case when is_open then 1 else 0 end) as is_open from public.storefront_tenant('shop-a')) s;
  if n <> 0 then raise exception 'is_open should be false'; end if;
  raise notice 'PASS expired trial locks store and hides storefront';

  -- super admin
  reset role; perform t.as_user(adm); set local role authenticated;
  select count(*) into n from public.tenants; if n <> 2 then raise exception 'admin sees % tenants', n; end if;
  perform public.admin_set_tenant_status(ta, 'suspended');
  insert into public.plans (code,name,billing_interval,price_paise,max_products) values ('tiny','Tiny','month',100,5);
  raise notice 'PASS super admin sees all, suspends, creates plans';
  perform t.as_user(a);
  perform t.expect_fail($q$insert into public.plans (code,name,billing_interval,price_paise) values ('evil','Evil','month',0)$q$, 'row-level security');
  reset role;
  raise notice 'ALL TESTS PASSED';
end $$;
