export type TenantRole = "owner" | "admin" | "staff";

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  created_at: string;
  email?: string;
  fullName?: string;
}

export interface TenantThemeSettings {
  primaryColor?: string;
  tagline?: string;
  bannerUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export interface TenantData {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
  status: "active" | "suspended";
  custom_domain: string | null;
  logo_url: string | null;
  settings: TenantThemeSettings;
  created_at: string;
}

export interface TenantUsageLimits {
  products: number | null;
  staff: number | null;
  orders_per_month: number | null;
  custom_domain: boolean;
}

export interface TenantUsageCounts {
  products: number;
  staff: number;
  orders_this_month: number;
}

export interface TenantUsageInfo {
  active: boolean;
  plan_name?: string;
  status?: string;
  period_end?: string | null;
  limits: TenantUsageLimits;
  usage: TenantUsageCounts;
}
