import { createClient } from "@/lib/supabase/server";
import type {
  VendorOrderListItem,
  VendorOrderDetail,
  OrderFilterParams,
  OrderStatus,
  OrderPaymentStatus,
} from "./types";

interface RawOrderRow {
  id: string;
  order_number: string;
  tenant_id: string;
  customer_id: string;
  subtotal: number | string;
  shipping_amount: number | string | null;
  total: number | string;
  status: string;
  payment_status: string;
  shipping_address: Record<string, string> | null;
  notes: string | null;
  created_at: string;
  customers: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  order_items: Array<{
    id: string;
    product_id: string | null;
    name: string;
    sku: string | null;
    unit_price: number | string;
    quantity: number | string;
    line_total: number | string;
    products?: {
      product_images?: Array<{ url: string; position: number }>;
    } | null;
  }>;
  order_events?: Array<{
    id: string;
    status: string;
    note: string | null;
    created_by: string | null;
    created_at: string;
  }>;
}

export async function getTenantOrders(
  tenantId: string,
  params: OrderFilterParams = {}
): Promise<{
  orders: VendorOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const supabase = await createClient();
  const page = Math.max(1, params.page || 1);
  const pageSize = params.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      tenant_id,
      customer_id,
      subtotal,
      shipping_amount,
      total,
      status,
      payment_status,
      created_at,
      customers:customer_id (id, name, email, phone),
      order_items (id, quantity)
    `,
      { count: "exact" }
    )
    .eq("tenant_id", tenantId);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.paymentStatus && params.paymentStatus !== "all") {
    query = query.eq("payment_status", params.paymentStatus);
  }

  if (params.from) {
    query = query.gte("created_at", new Date(params.from).toISOString());
  }

  if (params.to) {
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte("created_at", toDate.toISOString());
  }

  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    query = query.or(`order_number.ilike.${term}`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error(`[getTenantOrders] Error for tenant ${tenantId}:`, error.message);
    return { orders: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  const rows = (data || []) as unknown as RawOrderRow[];

  const orders: VendorOrderListItem[] = rows.map((row) => {
    const itemsCount = (row.order_items || []).reduce(
      (sum, item) => sum + Number(item.quantity || 1),
      0
    );

    return {
      id: row.id,
      order_number: row.order_number,
      created_at: row.created_at,
      customer_name: row.customers?.name || "Customer",
      customer_phone: row.customers?.phone || null,
      customer_email: row.customers?.email || null,
      status: row.status as OrderStatus,
      payment_status: row.payment_status as OrderPaymentStatus,
      items_count: itemsCount,
      total: Number(row.total),
    };
  });

  return { orders, total, page, pageSize, totalPages };
}

export async function getTenantOrderById(
  tenantId: string,
  orderId: string
): Promise<VendorOrderDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      tenant_id,
      customer_id,
      subtotal,
      shipping_amount,
      total,
      status,
      payment_status,
      shipping_address,
      notes,
      created_at,
      customers:customer_id (id, name, email, phone),
      order_items (
        id,
        product_id,
        name,
        sku,
        unit_price,
        quantity,
        line_total,
        products:product_id (
          product_images (url, position)
        )
      ),
      order_events (
        id,
        status,
        note,
        created_by,
        created_at
      )
    `
    )
    .eq("tenant_id", tenantId)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error(`[getTenantOrderById] Error for order ${orderId}:`, error.message);
    }
    return null;
  }

  const row = data as unknown as RawOrderRow;

  const items = (row.order_items || []).map((item) => {
    const images = Array.isArray(item.products?.product_images)
      ? [...item.products!.product_images!].sort((a, b) => a.position - b.position)
      : [];
    const image_url = images.length > 0 ? images[0].url : null;

    return {
      id: item.id,
      product_id: item.product_id,
      name: item.name,
      sku: item.sku,
      unit_price: Number(item.unit_price),
      quantity: Number(item.quantity),
      line_total: Number(item.line_total),
      image_url,
    };
  });

  const events = (row.order_events || [])
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((e) => ({
      id: e.id,
      status: e.status,
      note: e.note,
      created_by: e.created_by,
      created_by_name: null,
      created_at: e.created_at,
    }));

  return {
    id: row.id,
    order_number: row.order_number,
    tenant_id: row.tenant_id,
    customer_id: row.customer_id,
    subtotal: Number(row.subtotal),
    shipping_amount: Number(row.shipping_amount ?? 0),
    total: Number(row.total),
    status: row.status as OrderStatus,
    payment_status: row.payment_status as OrderPaymentStatus,
    shipping_address: row.shipping_address,
    notes: row.notes,
    created_at: row.created_at,
    customer: row.customers
      ? {
          id: row.customers.id,
          name: row.customers.name,
          email: row.customers.email,
          phone: row.customers.phone,
        }
      : null,
    items,
    events,
  };
}

export async function getTenantOrderStats(tenantId: string) {
  const supabase = await createClient();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select("id, status, payment_status, total, created_at")
    .eq("tenant_id", tenantId);

  const allOrders = (data || []) as unknown as Array<{
    id: string;
    status: string;
    payment_status: string;
    total: number | string;
    created_at: string;
  }>;

  if (error || !allOrders) {
    return {
      totalOrders: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      deliveredOrders: 0,
      todayRevenue: 0,
      weekRevenue: 0,
      recentOrders: [],
    };
  }

  const totalOrders = allOrders.length;
  let pendingOrders = 0;
  let confirmedOrders = 0;
  let deliveredOrders = 0;
  let todayRevenue = 0;
  let weekRevenue = 0;

  allOrders.forEach((o) => {
    const amt = Number(o.total || 0);
    if (o.status === "pending") pendingOrders++;
    if (o.status === "confirmed") confirmedOrders++;
    if (o.status === "delivered") deliveredOrders++;

    if (o.status !== "cancelled") {
      if (o.created_at >= startOfToday) {
        todayRevenue += amt;
      }
      if (o.created_at >= sevenDaysAgo) {
        weekRevenue += amt;
      }
    }
  });

  return {
    totalOrders,
    pendingOrders,
    confirmedOrders,
    deliveredOrders,
    todayRevenue,
    weekRevenue,
  };
}
