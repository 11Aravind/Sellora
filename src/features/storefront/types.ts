export interface StorefrontTenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  settings: {
    primaryColor?: string;
    tagline?: string;
    bannerUrl?: string;
    description?: string;
    currency?: string;
    [key: string]: unknown;
  } | null;
  is_open: boolean;
}

export interface StorefrontCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface StorefrontProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  position: number;
}

export interface StorefrontProduct {
  id: string;
  tenant_id: string;
  category_id: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price?: number | null;
  sku: string | null;
  barcode?: string | null;
  track_inventory: boolean;
  stock: number;
  low_stock_threshold: number | null;
  status: "draft" | "active" | "archived";
  primary_image?: string | null;
  images?: StorefrontProductImage[];
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface HydratedCartProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  track_inventory: boolean;
  status: string;
  primary_image: string | null;
}

export interface CartValidationWarning {
  productId: string;
  productName: string;
  type: "out_of_stock" | "stock_reduced" | "price_changed" | "unavailable";
  message: string;
  previousQuantity?: number;
  availableQuantity?: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  notes?: string;
}

export interface StorefrontOrderItem {
  id: string;
  product_id: string | null;
  name: string;
  sku: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface StorefrontOrder {
  id: string;
  order_number: string;
  tenant_id: string;
  customer_id: string;
  subtotal: number;
  shipping_amount: number;
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  shipping_address: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  order_items?: StorefrontOrderItem[];
}
