import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TenantData, TenantMember, TenantUsageInfo } from "./types";

interface TenantMemberRow {
  role: string;
  tenants: {
    id: string;
    slug: string;
    name: string;
    owner_id: string;
    status: "active" | "suspended";
    custom_domain: string | null;
    logo_url: string | null;
    settings: Record<string, unknown>;
    created_at: string;
  } | null;
}

/**
 * Resolves tenant and user's role by slug. Returns null if user is not a member.
 */
export async function getTenantBySlug(
  slug: string,
  userId: string
): Promise<{ tenant: TenantData; role: "owner" | "admin" | "staff" } | null> {
  const supabase = await createClient();

  const { data: memberData, error } = await supabase
    .from("tenant_members")
    .select(`
      role,
      tenants!inner (
        id,
        slug,
        name,
        owner_id,
        status,
        custom_domain,
        logo_url,
        settings,
        created_at
      )
    `)
    .eq("tenants.slug", slug)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !memberData) {
    return null;
  }

  const row = memberData as unknown as TenantMemberRow;
  if (!row.tenants) {
    return null;
  }

  const t = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;

  return {
    tenant: {
      id: t.id,
      slug: t.slug,
      name: t.name,
      owner_id: t.owner_id,
      status: t.status,
      custom_domain: t.custom_domain,
      logo_url: t.logo_url,
      settings: (t.settings as TenantData["settings"]) || {},
      created_at: t.created_at,
    },
    role: row.role as "owner" | "admin" | "staff",
  };
}

/**
 * Returns all stores the user belongs to (for store switcher).
 */
export async function getUserTenants(
  userId: string
): Promise<Array<{ id: string; name: string; slug: string; role: string }>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenant_members")
    .select(`
      role,
      tenants!inner (
        id,
        name,
        slug
      )
    `)
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  interface StoreMembership {
    role: string;
    tenants: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[];
  }

  const rows = data as unknown as StoreMembership[];

  return rows.map((r) => {
    const t = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      role: r.role,
    };
  });
}

/**
 * Calls tenant_usage RPC to fetch real-time quota meters.
 */
export async function getTenantUsage(tenantId: string): Promise<TenantUsageInfo> {
  const admin = createAdminClient();
  const { data } = await (
    admin.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>
  )("tenant_usage", { p_tenant: tenantId });

  const raw = data as Record<string, unknown> | null;

  const usageCounts = (raw?.usage as TenantUsageInfo["usage"]) || {
    products: 0,
    staff: 0,
    orders_this_month: 0,
  };

  const usageLimits = (raw?.limits as TenantUsageInfo["limits"]) || {
    products: null,
    staff: null,
    orders_per_month: null,
    custom_domain: false,
  };

  return {
    active: (raw?.active as boolean) ?? true,
    plan_name: raw?.plan_name as string | undefined,
    status: raw?.status as string | undefined,
    period_end: (raw?.period_end as string | null) || null,
    limits: usageLimits,
    usage: usageCounts,
  };
}

/**
 * Fetches all team members for a tenant.
 */
export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenant_members")
    .select(`
      id,
      tenant_id,
      user_id,
      role,
      created_at,
      profiles:user_id (
        id,
        email,
        full_name
      )
    `)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  interface RawMember {
    id: string;
    tenant_id: string;
    user_id: string;
    role: string;
    created_at: string;
    profiles?: {
      email?: string | null;
      full_name?: string | null;
    } | { email?: string | null; full_name?: string | null }[] | null;
  }

  const rows = data as unknown as RawMember[];

  return rows.map((r) => {
    const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      tenant_id: r.tenant_id,
      user_id: r.user_id,
      role: r.role as TenantMember["role"],
      created_at: r.created_at,
      email: prof?.email || undefined,
      fullName: prof?.full_name || undefined,
    };
  });
}

export interface TenantOverviewMetrics {
  revenueTodayPaise: number;
  revenue7DaysPaise: number;
  ordersTodayCount: number;
  orders7DaysCount: number;
  recentOrders: Array<{
    id: string;
    order_number: string;
    total: number;
    status: string;
    payment_status: string;
    created_at: string;
  }>;
}

/**
 * Fetches overview metrics for revenue and recent orders.
 */
export async function getTenantOverviewStats(tenantId: string): Promise<TenantOverviewMetrics> {
  const supabase = await createClient();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: orders7d }, { data: recentOrders }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total, status, payment_status, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("orders")
      .select("id, order_number, total, status, payment_status, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  interface OrderMetricRow {
    id: string;
    order_number?: string;
    total: number;
    status: string;
    payment_status: string;
    created_at: string;
  }

  const rows7d = (orders7d || []) as OrderMetricRow[];
  const recent = (recentOrders || []) as OrderMetricRow[];

  let revenueTodayPaise = 0;
  let revenue7DaysPaise = 0;
  let ordersTodayCount = 0;
  let orders7DaysCount = 0;

  for (const o of rows7d) {
    // Only count paid or valid orders toward revenue
    if (o.status !== "cancelled") {
      const orderTotalPaise = Math.round(Number(o.total || 0) * 100);
      revenue7DaysPaise += orderTotalPaise;
      orders7DaysCount += 1;

      if (o.created_at >= startOfToday) {
        revenueTodayPaise += orderTotalPaise;
        ordersTodayCount += 1;
      }
    }
  }

  return {
    revenueTodayPaise,
    revenue7DaysPaise,
    ordersTodayCount,
    orders7DaysCount,
    recentOrders: recent.map((r) => ({
      id: r.id,
      order_number: r.order_number || r.id.slice(0, 8),
      total: Number(r.total || 0),
      status: r.status,
      payment_status: r.payment_status,
      created_at: r.created_at,
    })),
  };
}
