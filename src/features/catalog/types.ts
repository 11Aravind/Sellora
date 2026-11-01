export type ProductStatus = "draft" | "active" | "archived";

export interface Category {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  parent?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface ProductImage {
  id: string;
  tenant_id: string;
  product_id: string;
  url: string;
  alt: string | null;
  position: number;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  sku: string | null;
  stock: number;
  track_inventory: boolean;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  product_images?: ProductImage[];
}

export interface ProductFilters {
  search?: string;
  status?: string;
  categoryId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
