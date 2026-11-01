-- =============================================================================
-- Migration: 20261103000000_notifications.sql
-- Goal: In-app notifications table and FCM push integration
-- =============================================================================

-- 1. Create notifications table
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

-- 2. Indexes for user inbox lookup and tenant filtering
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_tenant_idx
  on public.notifications (tenant_id);

create index if not exists notifications_tenant_type_idx
  on public.notifications (tenant_id, type, created_at desc);

-- 3. Row Level Security
alter table public.notifications enable row level security;

-- Grant permissions: authenticated users can SELECT, and UPDATE read_at column only.
-- Inserts and deletes are strictly performed via service role.
grant select on public.notifications to authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

