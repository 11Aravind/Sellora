import { createClient } from "@/lib/supabase/server";
import type { Category, Product, ProductFilters, PaginatedProducts } from "./types";

/**
 * Fetches all categories for a tenant, including parent category reference.
 */
export async function getCategories(tenantId: string): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select(`
      id,
      tenant_id,
      parent_id,
      name,
      slug,
      sort_order,
      created_at,
      updated_at,
      parent:parent_id (
        id,
        name,
        slug
      )
    `)
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  interface RawCategory {
    id: string;
    tenant_id: string;
    parent_id: string | null;
    name: string;
    slug: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
    parent?: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
  }

  const rows = data as unknown as RawCategory[];

  return rows.map((r) => ({
    id: r.id,
    tenant_id: r.tenant_id,
    parent_id: r.parent_id,
    name: r.name,
    slug: r.slug,
    sort_order: r.sort_order,
    created_at: r.created_at,
    updated_at: r.updated_at,
    parent: Array.isArray(r.parent) ? r.parent[0] : r.parent || null,
  }));
}

/**
 * Fetches a single category by ID.
 */
export async function getCategory(tenantId: string, id: string): Promise<Category | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select(`
      id,
      tenant_id,
      parent_id,
      name,
      slug,
      sort_order,
      created_at,
      updated_at,
      parent:parent_id (
        id,
        name,
        slug
      )
    `)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const r = data as unknown as {
    id: string;
    tenant_id: string;
    parent_id: string | null;
    name: string;
    slug: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
    parent?: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
  };

  return {
    id: r.id,
    tenant_id: r.tenant_id,
    parent_id: r.parent_id,
    name: r.name,
    slug: r.slug,
    sort_order: r.sort_order,
    created_at: r.created_at,
    updated_at: r.updated_at,
    parent: Array.isArray(r.parent) ? r.parent[0] : r.parent || null,
  };
}

/**
 * Fetches products for a tenant with filtering, sorting, and pagination.
 */
export async function getProducts(
  tenantId: string,
  filters: ProductFilters = {}
): Promise<PaginatedProducts> {
  const supabase = await createClient();

  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
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
      sku,
      stock,
      track_inventory,
      status,
      created_at,
      updated_at,
      categories:category_id (
        id,
        name,
        slug
      ),
      product_images (
        id,
        tenant_id,
        product_id,
        url,
        alt,
        position,
        created_at
      )
    `,
      { count: "exact" }
    )
    .eq("tenant_id", tenantId);

  // Status filter
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  // Category filter
  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  // Search filter
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
  }

  // Sorting
  switch (filters.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "name_asc":
      query = query.order("name", { ascending: true });
      break;
    case "stock_asc":
      query = query.order("stock", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, count, error } = await query.range(from, to);

  if (error || !data) {
    return {
      products: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
    };
  }

  interface RawProduct {
    id: string;
    tenant_id: string;
    category_id: string | null;
    name: string;
    slug: string;
    description: string | null;
    price: number | string;
    compare_at_price: number | string | null;
    sku: string | null;
    stock: number;
    track_inventory: boolean;
    status: "draft" | "active" | "archived";
    created_at: string;
    updated_at: string;
    categories?: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
    product_images?: Product["product_images"];
  }

  const rows = data as unknown as RawProduct[];
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const products: Product[] = rows.map((r) => ({
    id: r.id,
    tenant_id: r.tenant_id,
    category_id: r.category_id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    price: Number(r.price),
    compare_at_price: r.compare_at_price !== null ? Number(r.compare_at_price) : null,
    sku: r.sku,
    stock: r.stock,
    track_inventory: r.track_inventory,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    categories: Array.isArray(r.categories) ? r.categories[0] : r.categories || null,
    product_images: (r.product_images || []).sort((a, b) => a.position - b.position),
  }));

  return {
    products,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetches a single product by ID with full relations.
 */
export async function getProduct(tenantId: string, id: string): Promise<Product | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      tenant_id,
      category_id,
      name,
      slug,
      description,
      price,
      compare_at_price,
      sku,
      stock,
      track_inventory,
      status,
      created_at,
      updated_at,
      categories:category_id (
        id,
        name,
        slug
      ),
      product_images (
        id,
        tenant_id,
        product_id,
        url,
        alt,
        position,
        created_at
      )
    `)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  interface RawSingleProduct {
    id: string;
    tenant_id: string;
    category_id: string | null;
    name: string;
    slug: string;
    description: string | null;
    price: number | string;
    compare_at_price: number | string | null;
    sku: string | null;
    stock: number;
    track_inventory: boolean;
    status: "draft" | "active" | "archived";
    created_at: string;
    updated_at: string;
    categories?: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
    product_images?: Product["product_images"];
  }

  const r = data as unknown as RawSingleProduct;

  return {
    id: r.id,
    tenant_id: r.tenant_id,
    category_id: r.category_id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    price: Number(r.price),
    compare_at_price: r.compare_at_price !== null ? Number(r.compare_at_price) : null,
    sku: r.sku,
    stock: r.stock,
    track_inventory: r.track_inventory,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    categories: Array.isArray(r.categories) ? r.categories[0] : r.categories || null,
    product_images: (r.product_images || []).sort((a, b) => a.position - b.position),
  };
}

/**
 * Fetches products that are low in stock (<= 5).
 */
export async function getLowStockProducts(tenantId: string, threshold = 5): Promise<Product[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      tenant_id,
      category_id,
      name,
      slug,
      description,
      price,
      compare_at_price,
      sku,
      stock,
      track_inventory,
      status,
      created_at,
      updated_at
    `)
    .eq("tenant_id", tenantId)
    .eq("track_inventory", true)
    .neq("status", "archived")
    .lte("stock", threshold)
    .order("stock", { ascending: true })
    .limit(10);

  if (error || !data) {
    return [];
  }

  interface RawLowStock {
    id: string;
    tenant_id: string;
    category_id: string | null;
    name: string;
    slug: string;
    description: string | null;
    price: number | string;
    compare_at_price: number | string | null;
    sku: string | null;
    stock: number;
    track_inventory: boolean;
    status: "draft" | "active" | "archived";
    created_at: string;
    updated_at: string;
  }

  const rows = data as unknown as RawLowStock[];

  return rows.map((r) => ({
    id: r.id,
    tenant_id: r.tenant_id,
    category_id: r.category_id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    price: Number(r.price),
    compare_at_price: r.compare_at_price !== null ? Number(r.compare_at_price) : null,
    sku: r.sku,
    stock: r.stock,
    track_inventory: r.track_inventory,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}
