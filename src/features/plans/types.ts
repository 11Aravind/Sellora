export interface PlanWithMeta {
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
  razorpay_plan_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  subscriptions_count: number;
}

export interface SuperAdminOverviewStats {
  totalStores: number;
  activeStores: number;
  trialingSubscriptions: number;
  payingSubscriptions: number;
  estimatedMrrPaise: number;
  recentStores: {
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
    owner_email: string;
    plan_name: string;
  }[];
}

export interface AdminStoreListItem {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  created_at: string;
  owner_id: string;
  owner_email: string;
  owner_name: string;
  plan_name: string;
  plan_code: string;
  subscription_status: string;
  products_count: number;
  max_products: number | null;
}

export interface AdminStoreDetail {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  custom_domain: string | null;
  logo_url: string | null;
  created_at: string;
  owner: {
    id: string;
    email: string;
    full_name: string | null;
  };
  members: {
    user_id: string;
    email: string;
    full_name: string | null;
    role: "owner" | "admin" | "staff";
    created_at: string;
  }[];
  subscription: {
    id: string;
    plan_name: string;
    plan_code: string;
    status: string;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    price_paise: number;
    billing_interval: string;
  } | null;
  payments: {
    id: string;
    amount_paise: number;
    currency: string;
    status: string;
    razorpay_payment_id: string | null;
    created_at: string;
  }[];
  usage: {
    products_used: number;
    max_products: number | null;
    staff_used: number;
    max_staff: number | null;
    orders_used: number;
    max_orders: number | null;
    custom_domain_allowed: boolean;
  };
  ordersCount: number;
}

export interface AdminSubscriptionListItem {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  plan_id: string;
  plan_name: string;
  plan_code: string;
  price_paise: number;
  billing_interval: "month" | "year";
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
}
