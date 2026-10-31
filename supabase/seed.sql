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
