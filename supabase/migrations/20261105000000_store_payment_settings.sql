-- Migration: 20261105000000_store_payment_settings.sql
-- Multi-tenant payment gateway connections and payment preferences

create table if not exists public.tenant_payment_gateways (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    gateway_name text not null default 'razorpay',
    gateway_account_id text,
    connection_status text not null default 'not_connected' check (
        connection_status in (
            'not_connected',
            'connecting',
            'connected',
            'connection_failed',
            'disconnected'
        )
    ),
    encrypted_access_token text,
    encrypted_refresh_token text,
    token_expiry timestamptz,
    is_online_enabled boolean not null default false,
    is_cod_enabled boolean not null default true,
    supported_methods jsonb not null default '["card", "upi", "netbanking", "wallet"]'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_tenant_gateway unique (tenant_id, gateway_name)
);

-- Indexes
create index if not exists idx_tenant_payment_gateways_tenant on public.tenant_payment_gateways(tenant_id);
create index if not exists idx_tenant_payment_gateways_status on public.tenant_payment_gateways(connection_status);

-- Enable Row Level Security
alter table public.tenant_payment_gateways enable row level security;

-- Drop existing policies if any
drop policy if exists "tenant_payment_gateways_select_admin" on public.tenant_payment_gateways;
drop policy if exists "tenant_payment_gateways_insert_admin" on public.tenant_payment_gateways;
drop policy if exists "tenant_payment_gateways_update_admin" on public.tenant_payment_gateways;
drop policy if exists "tenant_payment_gateways_delete_admin" on public.tenant_payment_gateways;

-- RLS: Only Tenant Owners and Admins (and Platform Admins) can read
create policy "tenant_payment_gateways_select_admin"
on public.tenant_payment_gateways
for select
using (
    exists (
        select 1 from public.tenant_members tm
        where tm.tenant_id = tenant_payment_gateways.tenant_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid()
    )
);

-- RLS: Only Tenant Owners and Admins can insert
create policy "tenant_payment_gateways_insert_admin"
on public.tenant_payment_gateways
for insert
with check (
    exists (
        select 1 from public.tenant_members tm
        where tm.tenant_id = tenant_payment_gateways.tenant_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid()
    )
);

-- RLS: Only Tenant Owners and Admins can update
create policy "tenant_payment_gateways_update_admin"
on public.tenant_payment_gateways
for update
using (
    exists (
        select 1 from public.tenant_members tm
        where tm.tenant_id = tenant_payment_gateways.tenant_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.tenant_members tm
        where tm.tenant_id = tenant_payment_gateways.tenant_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid()
    )
);

-- RLS: Only Tenant Owners and Admins can delete
create policy "tenant_payment_gateways_delete_admin"
on public.tenant_payment_gateways
for delete
using (
    exists (
        select 1 from public.tenant_members tm
        where tm.tenant_id = tenant_payment_gateways.tenant_id
          and tm.user_id = auth.uid()
          and tm.role in ('owner', 'admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid()
    )
);

-- Trigger to auto-update updated_at timestamp
create or replace function public.set_tenant_payment_gateways_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tenant_payment_gateways_updated_at on public.tenant_payment_gateways;
create trigger trg_tenant_payment_gateways_updated_at
before update on public.tenant_payment_gateways
for each row
execute function public.set_tenant_payment_gateways_updated_at();

-- Safe public RPC for storefront to query available payment methods without exposing tokens
create or replace function public.get_storefront_payment_settings(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
stable
as $$
declare
    v_record record;
begin
    select
        connection_status,
        is_online_enabled,
        is_cod_enabled,
        supported_methods,
        gateway_name
    into v_record
    from public.tenant_payment_gateways
    where tenant_id = p_tenant_id and gateway_name = 'razorpay'
    limit 1;

    if not found then
        return jsonb_build_object(
            'is_online_enabled', false,
            'is_cod_enabled', true,
            'supported_methods', '["cod"]'::jsonb,
            'gateway_name', 'razorpay',
            'connection_status', 'not_connected'
        );
    end if;

    return jsonb_build_object(
        'is_online_enabled', v_record.is_online_enabled and (v_record.connection_status = 'connected'),
        'is_cod_enabled', v_record.is_cod_enabled,
        'supported_methods', v_record.supported_methods,
        'gateway_name', v_record.gateway_name,
        'connection_status', v_record.connection_status
    );
end;
$$;

