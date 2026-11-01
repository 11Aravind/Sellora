import { cache } from "react";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createAnonClient } from "@/lib/supabase/anon";
import type {
  StorefrontTenant,
  StorefrontCategory,
  StorefrontProduct,
  StorefrontProductImage,
  HydratedCartProduct,
  StorefrontOrder,
} from "./types";

interface StorefrontTenantRow {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  settings: Record<string, unknown> | null;
  is_open: boolean;
}

interface ProductQueryRow {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  cost_price: number | string | null;
  sku: string | null;
  barcode: string | null;
  track_inventory: boolean;
  stock: number | string;
  low_stock_threshold: number | string | null;
  status: "draft" | "active" | "archived";
  created_at: string;
  updated_at: string;
  categories: { name?: string; slug?: string } | null;
  images: Array<{ id: string; url: string; alt_text: string | null; position: number }>;
}

interface CartProductQueryRow {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  compare_at_price: number | string | null;
  stock: number | string;
  track_inventory: boolean;
  status: string;
  images: Array<{ url: string; position: number }>;
}

interface OrderItemQueryRow {
  id: string;
  product_id: string | null;
  name: string;
  sku: string | null;
  unit_price: number | string;
  quantity: number | string;
  line_total: number | string;
}

interface OrderQueryRow {
  id: string;
  order_number: string;
  tenant_id: string;
  customer_id: string;
  subtotal: number | string;
  shipping_amount: number | string | null;
  total: number | string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  shipping_address: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  order_items: OrderItemQueryRow[];
}


/**
 * Fetches public storefront tenant data by store slug.
 * Wrapped in React cache() to deduplicate requests across layouts and pages within a single render cycle.
 */
export const getStorefrontTenant = cache(
  async (slug: string): Promise<StorefrontTenant | null> => {
    if (!slug) return null;

    const supabase = createAnonClient();
    const { data, error } = await (supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>
      ) => Promise<{ data: StorefrontTenantRow[] | null; error: { message: string } | null }>;
    }).rpc("storefront_tenant", {
      p_slug: slug.toLowerCase(),
    });

    if (error) {
      console.error(`[getStorefrontTenant] RPC error for slug "${slug}":`, error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const tenant = data[0];
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      logo_url: tenant.logo_url,
      settings: (tenant.settings as Record<string, unknown>) ?? null,
      is_open: Boolean(tenant.is_open),
    };
  }
);

/**
 * Fetches active categories for a tenant using the public/anon client.
 */
export const getStorefrontCategories = cache(
  async (tenantId: string): Promise<StorefrontCategory[]> => {
    if (!tenantId) return [];

    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, description")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) {
      console.error(`[getStorefrontCategories] Error for tenant ${tenantId}:`, error.message);
      return [];
    }

    return (data || []) as StorefrontCategory[];
  }
);

interface GetStorefrontProductsParams {
  tenantId: string;
  query?: string;
  categorySlug?: string;
  sort?: "newest" | "price-asc" | "price-desc";
  page?: number;
  pageSize?: number;
  limit?: number;
}

/**
 * Fetches active products for a tenant with filtering, search, sorting, and pagination.
 */
export async function getStorefrontProducts({
  tenantId,
  query,
  categorySlug,
  sort = "newest",
  page = 1,
  pageSize = 12,
  limit,
}: GetStorefrontProductsParams): Promise<{
  products: StorefrontProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  if (!tenantId) {
    return { products: [], total: 0, page: 1, pageSize, totalPages: 0 };
  }

  const supabase = createAnonClient();

  // If categorySlug provided, find category_id first
  let categoryId: string | null = null;
  if (categorySlug) {
    const { data: catData } = await supabase
      .from("categories")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("slug", categorySlug)
      .maybeSingle();
    const cat = catData as unknown as { id: string } | null;
    if (cat) {
      categoryId = cat.id;
    } else {
      // Category slug doesn't exist
      return { products: [], total: 0, page: 1, pageSize, totalPages: 0 };
    }
  }

  const actualPageSize = limit ? limit : pageSize;
  const from = (page - 1) * actualPageSize;
  const to = from + actualPageSize - 1;

  let queryBuilder = supabase
    .from("products")
    .select(
      `
      id,
      tenant_id,
      category_id,
      name,
      slug,
      description,
      price,
      compare_at_price,
      cost_price,
      sku,
      barcode,
      track_inventory,
      stock,
      low_stock_threshold,
      status,
      created_at,
      updated_at,
      categories:category_id (name, slug),
      images:product_images (id, url, alt_text, position)
    `,
      { count: "exact" }
    )
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (categoryId) {
    queryBuilder = queryBuilder.eq("category_id", categoryId);
  }

  if (query && query.trim()) {
    const searchTerm = `%${query.trim()}%`;
    queryBuilder = queryBuilder.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);
  }

  switch (sort) {
    case "price-asc":
      queryBuilder = queryBuilder.order("price", { ascending: true });
      break;
    case "price-desc":
      queryBuilder = queryBuilder.order("price", { ascending: false });
      break;
    case "newest":
    default:
      queryBuilder = queryBuilder.order("created_at", { ascending: false });
      break;
  }

  const { data, count, error } = await queryBuilder.range(from, to);

  if (error) {
    console.error(`[getStorefrontProducts] Error for tenant ${tenantId}:`, error.message);
    return { products: [], total: 0, page, pageSize: actualPageSize, totalPages: 0 };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / actualPageSize);

  const rows = (data || []) as unknown as ProductQueryRow[];

  // Map products and extract primary image (lowest position)
  const products: StorefrontProduct[] = rows.map((row) => {
    const images: StorefrontProductImage[] = Array.isArray(row.images)
      ? [...row.images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      : [];
    const primary_image = images.length > 0 ? images[0].url : null;
    const cat = row.categories;

    return {
      id: row.id,
      tenant_id: row.tenant_id,
      category_id: row.category_id,
      category_name: cat?.name ?? null,
      category_slug: cat?.slug ?? null,
      name: row.name,
      slug: row.slug,
      description: row.description,
      price: Number(row.price),
      compare_at_price: row.compare_at_price !== null ? Number(row.compare_at_price) : null,
      cost_price: row.cost_price !== null ? Number(row.cost_price) : null,
      sku: row.sku,
      barcode: row.barcode,
      track_inventory: Boolean(row.track_inventory),
      stock: Number(row.stock),
      low_stock_threshold: row.low_stock_threshold !== null ? Number(row.low_stock_threshold) : null,
      status: row.status,
      primary_image,
      images,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  return {
    products,
    total,
    page,
    pageSize: actualPageSize,
    totalPages,
  };
}

/**
 * Fetches a single active product by slug for a tenant.
 */
export const getStorefrontProductBySlug = cache(
  async (tenantId: string, productSlug: string): Promise<StorefrontProduct | null> => {
    if (!tenantId || !productSlug) return null;

    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        id,
        tenant_id,
        category_id,
        name,
        slug,
        description,
        price,
        compare_at_price,
        cost_price,
        sku,
        barcode,
        track_inventory,
        stock,
        low_stock_threshold,
        status,
        created_at,
        updated_at,
        categories:category_id (name, slug),
        images:product_images (id, url, alt_text, position)
      `
      )
      .eq("tenant_id", tenantId)
      .eq("slug", productSlug)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error(`[getStorefrontProductBySlug] Error for slug "${productSlug}":`, error.message);
      return null;
    }

    if (!data) return null;

    const row = data as unknown as ProductQueryRow;
    const images: StorefrontProductImage[] = Array.isArray(row.images)
      ? [...row.images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      : [];
    const primary_image = images.length > 0 ? images[0].url : null;
    const cat = row.categories;

    return {
      id: row.id,
      tenant_id: row.tenant_id,
      category_id: row.category_id,
      category_name: cat?.name ?? null,
      category_slug: cat?.slug ?? null,
      name: row.name,
      slug: row.slug,
      description: row.description,
      price: Number(row.price),
      compare_at_price: row.compare_at_price !== null ? Number(row.compare_at_price) : null,
      cost_price: row.cost_price !== null ? Number(row.cost_price) : null,
      sku: row.sku,
      barcode: row.barcode,
      track_inventory: Boolean(row.track_inventory),
      stock: Number(row.stock),
      low_stock_threshold: row.low_stock_threshold !== null ? Number(row.low_stock_threshold) : null,
      status: row.status,
      primary_image,
      images,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
);

/**
 * Re-fetches current live pricing, stock, and availability from the DB for cart item IDs.
 * Used on /cart and /checkout to ensure prices and stock are fresh and not tampered with.
 */
export async function getCartHydratedProducts(
  tenantId: string,
  productIds: string[]
): Promise<HydratedCartProduct[]> {
  if (!tenantId || !productIds || productIds.length === 0) return [];

  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      price,
      compare_at_price,
      stock,
      track_inventory,
      status,
      images:product_images (url, position)
    `
    )
    .eq("tenant_id", tenantId)
    .in("id", productIds);

  if (error) {
    console.error(`[getCartHydratedProducts] Error for tenant ${tenantId}:`, error.message);
    return [];
  }

  const rows = (data || []) as unknown as CartProductQueryRow[];

  return rows.map((row) => {
    const images = Array.isArray(row.images)
      ? [...row.images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      : [];
    const primary_image = images.length > 0 ? images[0].url : null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.price),
      compare_at_price: row.compare_at_price !== null ? Number(row.compare_at_price) : null,
      stock: Number(row.stock),
      track_inventory: Boolean(row.track_inventory),
      status: row.status,
      primary_image,
    };
  });
}

/**
 * Fetches authenticated customer's previous orders for this tenant.
 * RLS ensures only orders matching the user's customer record are returned.
 */
export async function getCustomerOrders(tenantId: string): Promise<StorefrontOrder[]> {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

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
      order_items (
        id,
        product_id,
        name,
        sku,
        unit_price,
        quantity,
        line_total
      )
    `
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`[getCustomerOrders] Error for tenant ${tenantId}:`, error.message);
    return [];
  }

  const rows = (data || []) as unknown as OrderQueryRow[];

  return rows.map((row) => ({
    id: row.id,
    order_number: row.order_number,
    tenant_id: row.tenant_id,
    customer_id: row.customer_id,
    subtotal: Number(row.subtotal),
    shipping_amount: Number(row.shipping_amount ?? 0),
    total: Number(row.total),
    status: row.status,
    payment_status: row.payment_status,
    shipping_address: row.shipping_address,
    notes: row.notes,
    created_at: row.created_at,
    order_items: (row.order_items || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      name: item.name,
      sku: item.sku,
      unit_price: Number(item.unit_price),
      quantity: Number(item.quantity),
      line_total: Number(item.line_total),
    })),
  }));
}

/**
 * Fetches single order details for the authenticated customer.
 */
export async function getCustomerOrderById(
  tenantId: string,
  orderId: string
): Promise<StorefrontOrder | null> {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

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
      order_items (
        id,
        product_id,
        name,
        sku,
        unit_price,
        quantity,
        line_total
      )
    `
    )
    .eq("tenant_id", tenantId)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error(`[getCustomerOrderById] Error for order ${orderId}:`, error.message);
    }
    return null;
  }

  const row = data as unknown as OrderQueryRow;
  return {
    id: row.id,
    order_number: row.order_number,
    tenant_id: row.tenant_id,
    customer_id: row.customer_id,
    subtotal: Number(row.subtotal),
    shipping_amount: Number(row.shipping_amount ?? 0),
    total: Number(row.total),
    status: row.status,
    payment_status: row.payment_status,
    shipping_address: row.shipping_address,
    notes: row.notes,
    created_at: row.created_at,
    order_items: (row.order_items || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      name: item.name,
      sku: item.sku,
      unit_price: Number(item.unit_price),
      quantity: Number(item.quantity),
      line_total: Number(item.line_total),
    })),
  };
}
