-- =============================================================================
-- Migration: 20261104000000_rate_limiting.sql
-- Goal: PostgreSQL-backed sliding-window rate limiting for auth, orders, and slugs
-- =============================================================================

-- 1. Create rate limiting tracking table
create table if not exists public.rate_limit_buckets (
  key         text primary key,
  count       int not null default 1,
  reset_at    timestamptz not null
);

-- 2. Index on reset_at for periodic cleanup
create index if not exists rate_limit_buckets_reset_idx
  on public.rate_limit_buckets (reset_at);

-- 3. Row Level Security: restricted to service role
alter table public.rate_limit_buckets enable row level security;

-- 4. Atomic rate check function
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
  -- Clean up expired record for this key if past reset_at
  delete from public.rate_limit_buckets
   where key = p_key
     and reset_at <= v_now;

  -- Upsert: insert new bucket or increment existing count
  insert into public.rate_limit_buckets (key, count, reset_at)
  values (p_key, 1, v_now + (p_window_seconds || ' seconds')::interval)
  on conflict (key) do update
    set count = public.rate_limit_buckets.count + 1
  returning * into v_bucket;

  -- If count exceeds limit, return false (rate-limited)
  if v_bucket.count > p_limit then
    return false;
  end if;

  return true;
end;
$$;

-- Grant execution to authenticated and anon so Server Actions can check rates
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated, service_role;

