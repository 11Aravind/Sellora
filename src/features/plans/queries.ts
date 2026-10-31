import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type {
  PlanWithMeta,
  SuperAdminOverviewStats,
  AdminStoreListItem,
  AdminStoreDetail,
  AdminSubscriptionListItem,
} from "./types";

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billing_interval: "month" | "year";
  price_paise: number;
  currency: string;
  trial_days: number;
  max_products: number | null;
  max_staff: number | null;
  max_orders_per_month: number | null;
  custom_domain_allowed: boolean;
  features: string[];
  sort_order: number;
  is_active: boolean;
}

type TenantRow = Database["public"]["Tables"]["tenants"]["Row"];
type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];
type PlanRow = Database["public"]["Tables"]["plans"]["Row"];
type PaymentRow = Database["public"]["Tables"]["subscription_payments"]["Row"];
type MemberRow = Database["public"]["Tables"]["tenant_members"]["Row"];

interface TenantUsageRpcResult {
  active: boolean;
  plan_name?: string;
  status?: string;
  limits: {
    products: number | null;
    staff: number | null;
    orders_per_month: number | null;
    custom_domain: boolean;
  };
  usage: {
    products: number;
    staff: number;
    orders_this_month: number;
  };
}

type RpcCaller = (
  fn: string,
  args?: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Helper to fetch user details (email and name) via admin auth API.
 */
async function getUserMap(): Promise<Map<string, { email: string; name: string }>> {
  const admin = createAdminClient();
  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const map = new Map<string, { email: string; name: string }>();
    if (data?.users) {
      for (const u of data.users) {
        map.set(u.id, {
          email: u.email || "No email",
          name: (u.user_metadata?.full_name as string) || "Anonymous",
        });
      }
    }
    return map;
  } catch (err) {
    console.error("[getUserMap] Error listing users:", err);
    return new Map();
  }
}

/**
 * Returns all active plans for onboarding and pricing pages.
 */
export async function getActivePlans(): Promise<Plan[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("price_paise", { ascending: true });

  if (error || !data) return [];
  const rows = data as unknown as PlanRow[];
  return rows.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    billing_interval: p.billing_interval,
    price_paise: p.price_paise,
    currency: p.currency,
    trial_days: p.trial_days,
    max_products: p.max_products,
    max_staff: p.max_staff,
    max_orders_per_month: p.max_orders_per_month,
    custom_domain_allowed: p.custom_domain_allowed,
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
    sort_order: p.sort_order,
    is_active: p.is_active,
  }));
}

/**
 * Computes high-level overview metrics for the platform owner dashboard.
 */
export async function getSuperAdminOverview(): Promise<SuperAdminOverviewStats> {
  const admin = createAdminClient();

  // 1. Total & Active stores
  const [
    { count: totalStores },
    { count: activeStores },
    { count: trialingSubscriptions },
    { count: payingSubscriptions },
  ] = await Promise.all([
    admin.from("tenants").select("*", { count: "exact", head: true }),
    admin.from("tenants").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "trialing"),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  // 2. Compute Estimated MRR from all active subscriptions
  const [{ data: activeSubsData }, { data: allPlansData }] = await Promise.all([
    admin.from("subscriptions").select("*").eq("status", "active"),
    admin.from("plans").select("*"),
  ]);

  const activeSubs = (activeSubsData as unknown as SubscriptionRow[]) || [];
  const allPlans = (allPlansData as unknown as PlanRow[]) || [];
  const planMap = new Map(allPlans.map((p) => [p.id, p]));

  let estimatedMrrPaise = 0;
  for (const sub of activeSubs) {
    const plan = planMap.get(sub.plan_id);
    if (plan && plan.price_paise) {
      if (plan.billing_interval === "year") {
        estimatedMrrPaise += Math.round(plan.price_paise / 12);
      } else {
        estimatedMrrPaise += plan.price_paise;
      }
    }
  }

  // 3. Ten newest stores
  const { data: recentTenantsData } = await admin
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const recentTenants = (recentTenantsData as unknown as TenantRow[]) || [];
  const tenantIds = recentTenants.map((t) => t.id);

  const [{ data: tenantSubsData }, userMap] = await Promise.all([
    tenantIds.length
      ? admin.from("subscriptions").select("*").in("tenant_id", tenantIds)
      : { data: [] },
    getUserMap(),
  ]);

  const tenantSubs = (tenantSubsData as unknown as SubscriptionRow[]) || [];
  const subMap = new Map(tenantSubs.map((s) => [s.tenant_id, s]));

  const recentStores = recentTenants.map((t) => {
    const sub = subMap.get(t.id);
    const plan = sub ? planMap.get(sub.plan_id) : null;
    const ownerInfo = userMap.get(t.owner_id);

    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      created_at: t.created_at,
      owner_email: ownerInfo?.email || "Unknown",
      plan_name: plan?.name || "No Plan",
    };
  });

  return {
    totalStores: totalStores || 0,
    activeStores: activeStores || 0,
    trialingSubscriptions: trialingSubscriptions || 0,
    payingSubscriptions: payingSubscriptions || 0,
    estimatedMrrPaise,
    recentStores,
  };
}

/**
 * Returns all subscription plans with metadata and subscription counts.
 */
export async function getSuperAdminPlans(): Promise<PlanWithMeta[]> {
  const admin = createAdminClient();

  const [{ data: plansData, error }, { data: subsData }] = await Promise.all([
    admin.from("plans").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    admin.from("subscriptions").select("*"),
  ]);

  if (error || !plansData) {
    console.error("[getSuperAdminPlans] error:", error);
    return [];
  }

  const plans = plansData as unknown as PlanRow[];
  const subs = (subsData as unknown as SubscriptionRow[]) || [];

  const countMap = new Map<string, number>();
  subs.forEach((s) => {
    countMap.set(s.plan_id, (countMap.get(s.plan_id) || 0) + 1);
  });

  return plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    billing_interval: p.billing_interval,
    price_paise: p.price_paise,
    currency: p.currency,
    trial_days: p.trial_days,
    max_products: p.max_products,
    max_staff: p.max_staff,
    max_orders_per_month: p.max_orders_per_month,
    custom_domain_allowed: p.custom_domain_allowed,
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
    razorpay_plan_id: p.razorpay_plan_id,
    is_active: p.is_active,
    sort_order: p.sort_order,
    created_at: p.created_at,
    updated_at: p.updated_at,
    subscriptions_count: countMap.get(p.id) || 0,
  }));
}

/**
 * Returns a paginated list of stores with search and filtering.
 */
export async function getSuperAdminStores({
  search,
  status,
  planCode,
  page = 1,
  pageSize = 20,
}: {
  search?: string;
  status?: string;
  planCode?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ stores: AdminStoreListItem[]; totalCount: number; totalPages: number }> {
  const admin = createAdminClient();

  let query = admin.from("tenants").select("*", { count: "exact" });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    const term = search.trim().toLowerCase();
    query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);
  }

  const offset = (page - 1) * pageSize;
  const { data: tenantsData, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error || !tenantsData) {
    console.error("[getSuperAdminStores] error:", error);
    return { stores: [], totalCount: 0, totalPages: 0 };
  }

  const tenants = tenantsData as unknown as TenantRow[];
  const tenantIds = tenants.map((t) => t.id);

  const [{ data: subsData }, { data: plansData }, { data: productsData }, userMap] = await Promise.all([
    tenantIds.length
      ? admin.from("subscriptions").select("*").in("tenant_id", tenantIds)
      : { data: [] },
    admin.from("plans").select("*"),
    tenantIds.length
      ? admin.from("products").select("tenant_id").in("tenant_id", tenantIds)
      : { data: [] },
    getUserMap(),
  ]);

  const subs = (subsData as unknown as SubscriptionRow[]) || [];
  const plans = (plansData as unknown as PlanRow[]) || [];
  const products = (productsData as unknown as { tenant_id: string }[]) || [];

  const subMap = new Map(subs.map((s) => [s.tenant_id, s]));
  const planMap = new Map(plans.map((p) => [p.id, p]));

  const productCountMap = new Map<string, number>();
  products.forEach((p) => {
    productCountMap.set(p.tenant_id, (productCountMap.get(p.tenant_id) || 0) + 1);
  });

  let filteredTenants = tenants;
  if (planCode && planCode !== "all") {
    filteredTenants = tenants.filter((t) => {
      const sub = subMap.get(t.id);
      const plan = sub ? planMap.get(sub.plan_id) : null;
      return plan?.code === planCode;
    });
  }

  const stores: AdminStoreListItem[] = filteredTenants.map((t) => {
    const owner = userMap.get(t.owner_id);
    const sub = subMap.get(t.id);
    const plan = sub ? planMap.get(sub.plan_id) : null;

    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      created_at: t.created_at,
      owner_id: t.owner_id,
      owner_email: owner?.email || "Unknown",
      owner_name: owner?.name || "Unknown",
      plan_name: plan?.name || "No Plan",
      plan_code: plan?.code || "none",
      subscription_status: sub?.status || "none",
      products_count: productCountMap.get(t.id) || 0,
      max_products: plan?.max_products ?? null,
    };
  });

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return { stores, totalCount, totalPages };
}

/**
 * Returns deep details for a single store, including members, payments, and usage metrics.
 */
export async function getSuperAdminStoreDetail(
  tenantId: string
): Promise<AdminStoreDetail | null> {
  const admin = createAdminClient();

  const [
    { data: tenantData, error },
    { data: subData },
    { data: membersData },
    { data: paymentsData },
    { count: ordersCount },
    userMap,
  ] = await Promise.all([
    admin.from("tenants").select("*").eq("id", tenantId).single(),
    admin.from("subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle(),
    admin.from("tenant_members").select("*").eq("tenant_id", tenantId),
    admin.from("subscription_payments").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    getUserMap(),
  ]);

  if (error || !tenantData) {
    console.error("[getSuperAdminStoreDetail] error:", error);
    return null;
  }

  const tenant = tenantData as unknown as TenantRow;
  const sub = subData as unknown as SubscriptionRow | null;
  const members = (membersData as unknown as MemberRow[]) || [];
  const payments = (paymentsData as unknown as PaymentRow[]) || [];

  const planId = sub?.plan_id;
  const { data: planData } = planId
    ? await admin.from("plans").select("*").eq("id", planId).single()
    : { data: null };

  const plan = planData as unknown as PlanRow | null;
  const ownerProfile = userMap.get(tenant.owner_id);

  // Call RPC tenant_usage for real-time entitlement / usage check
  const callRpc = admin.rpc as unknown as RpcCaller;
  const { data: usageData } = await callRpc("tenant_usage", {
    p_tenant: tenant.id,
  });

  const parsedUsage = usageData as unknown as TenantUsageRpcResult;

  const mappedMembers = members.map((m) => {
    const prof = userMap.get(m.user_id);
    return {
      user_id: m.user_id,
      email: prof?.email || "Unknown",
      full_name: prof?.name || null,
      role: m.role,
      created_at: m.created_at,
    };
  });

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    custom_domain: tenant.custom_domain,
    logo_url: tenant.logo_url,
    created_at: tenant.created_at,
    owner: {
      id: tenant.owner_id,
      email: ownerProfile?.email || "Unknown",
      full_name: ownerProfile?.name || null,
    },
    members: mappedMembers,
    subscription: sub && plan ? {
      id: sub.id,
      plan_name: plan.name,
      plan_code: plan.code,
      status: sub.status,
      trial_ends_at: sub.trial_ends_at,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      price_paise: plan.price_paise,
      billing_interval: plan.billing_interval,
    } : null,
    payments: payments.map((p) => ({
      id: p.id,
      amount_paise: p.amount_paise,
      currency: p.currency,
      status: p.status,
      razorpay_payment_id: p.razorpay_payment_id,
      created_at: p.created_at,
    })),
    usage: {
      products_used: parsedUsage?.usage?.products || 0,
      max_products: parsedUsage?.limits?.products ?? null,
      staff_used: parsedUsage?.usage?.staff || 0,
      max_staff: parsedUsage?.limits?.staff ?? null,
      orders_used: parsedUsage?.usage?.orders_this_month || 0,
      max_orders: parsedUsage?.limits?.orders_per_month ?? null,
      custom_domain_allowed: Boolean(parsedUsage?.limits?.custom_domain),
    },
    ordersCount: ordersCount || 0,
  };
}

/**
 * Returns a paginated list of all platform subscriptions with filter options.
 */
export async function getSuperAdminSubscriptions({
  status,
  trialEndingSoon = false,
  pastDue = false,
  page = 1,
  pageSize = 20,
}: {
  status?: string;
  trialEndingSoon?: boolean;
  pastDue?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ subscriptions: AdminSubscriptionListItem[]; totalCount: number; totalPages: number }> {
  const admin = createAdminClient();

  let query = admin.from("subscriptions").select("*", { count: "exact" });

  if (pastDue) {
    query = query.eq("status", "past_due");
  } else if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (trialEndingSoon) {
    const now = new Date();
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    query = query
      .eq("status", "trialing")
      .gte("trial_ends_at", now.toISOString())
      .lte("trial_ends_at", in7Days.toISOString());
  }

  const offset = (page - 1) * pageSize;
  const { data: subsData, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error || !subsData) {
    console.error("[getSuperAdminSubscriptions] error:", error);
    return { subscriptions: [], totalCount: 0, totalPages: 0 };
  }

  const subs = subsData as unknown as SubscriptionRow[];
  const tenantIds = subs.map((s) => s.tenant_id);
  const planIds = Array.from(new Set(subs.map((s) => s.plan_id)));

  const [{ data: tenantsData }, { data: plansData }] = await Promise.all([
    tenantIds.length
      ? admin.from("tenants").select("*").in("id", tenantIds)
      : { data: [] },
    planIds.length
      ? admin.from("plans").select("*").in("id", planIds)
      : { data: [] },
  ]);

  const tenants = (tenantsData as unknown as TenantRow[]) || [];
  const plans = (plansData as unknown as PlanRow[]) || [];

  const tenantMap = new Map(tenants.map((t) => [t.id, t]));
  const planMap = new Map(plans.map((p) => [p.id, p]));

  const subscriptions: AdminSubscriptionListItem[] = subs.map((s) => {
    const tenant = tenantMap.get(s.tenant_id);
    const plan = planMap.get(s.plan_id);

    return {
      id: s.id,
      tenant_id: s.tenant_id,
      tenant_name: tenant?.name || "Unknown Store",
      tenant_slug: tenant?.slug || "unknown",
      plan_id: s.plan_id,
      plan_name: plan?.name || "Unknown Plan",
      plan_code: plan?.code || "unknown",
      price_paise: plan?.price_paise || 0,
      billing_interval: plan?.billing_interval || "month",
      status: s.status,
      trial_ends_at: s.trial_ends_at,
      current_period_end: s.current_period_end,
      created_at: s.created_at,
    };
  });

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return { subscriptions, totalCount, totalPages };
}
