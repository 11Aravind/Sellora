export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export interface OrderCustomerInfo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface OrderItemDetail {
  id: string;
  product_id: string | null;
  name: string;
  sku: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  image_url: string | null;
}

export interface OrderEventItem {
  id: string;
  status: string;
  note: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface VendorOrderDetail {
  id: string;
  order_number: string;
  tenant_id: string;
  customer_id: string;
  subtotal: number;
  shipping_amount: number;
  total: number;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  shipping_address: Record<string, string> | null;
  notes: string | null;
  created_at: string;
  customer: OrderCustomerInfo | null;
  items: OrderItemDetail[];
  events: OrderEventItem[];
}

export interface VendorOrderListItem {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  items_count: number;
  total: number;
}

export interface OrderFilterParams {
  status?: string;
  paymentStatus?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
