export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      platform_admins: {
        Row: {
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
        };
      };
      plans: {
        Row: {
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
          features: Json;
          razorpay_plan_id: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          billing_interval: "month" | "year";
          price_paise: number;
          currency?: string;
          trial_days?: number;
          max_products?: number | null;
          max_staff?: number | null;
          max_orders_per_month?: number | null;
          custom_domain_allowed?: boolean;
          features?: Json;
          razorpay_plan_id?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          billing_interval?: "month" | "year";
          price_paise?: number;
          currency?: string;
          trial_days?: number;
          max_products?: number | null;
          max_staff?: number | null;
          max_orders_per_month?: number | null;
          custom_domain_allowed?: boolean;
          features?: Json;
          razorpay_plan_id?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          owner_id: string;
          status: "active" | "suspended";
          custom_domain: string | null;
          logo_url: string | null;
          settings: Json;
          order_seq: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          owner_id: string;
          status?: "active" | "suspended";
          custom_domain?: string | null;
          logo_url?: string | null;
          settings?: Json;
          order_seq?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          owner_id?: string;
          status?: "active" | "suspended";
          custom_domain?: string | null;
          logo_url?: string | null;
          settings?: Json;
          order_seq?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tenant_members: {
        Row: {
          tenant_id: string;
          user_id: string;
          role: "owner" | "admin" | "staff";
          created_at: string;
        };
        Insert: {
          tenant_id: string;
          user_id: string;
          role: "owner" | "admin" | "staff";
          created_at?: string;
        };
        Update: {
          tenant_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "staff";
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          tenant_id: string;
          plan_id: string;
          status: "incomplete" | "trialing" | "active" | "past_due" | "cancelled" | "expired";
          trial_ends_at: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          razorpay_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          plan_id: string;
          status: "incomplete" | "trialing" | "active" | "past_due" | "cancelled" | "expired";
          trial_ends_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          razorpay_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          plan_id?: string;
          status?: "incomplete" | "trialing" | "active" | "past_due" | "cancelled" | "expired";
          trial_ends_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          razorpay_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscription_payments: {
        Row: {
          id: string;
          tenant_id: string;
          subscription_id: string | null;
          amount_paise: number;
          currency: string;
          status: "created" | "paid" | "failed" | "refunded";
          razorpay_payment_id: string | null;
          razorpay_order_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          subscription_id?: string | null;
          amount_paise: number;
          currency?: string;
          status: "created" | "paid" | "failed" | "refunded";
          razorpay_payment_id?: string | null;
          razorpay_order_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          subscription_id?: string | null;
          amount_paise?: number;
          currency?: string;
          status?: "created" | "paid" | "failed" | "refunded";
          razorpay_payment_id?: string | null;
          razorpay_order_id?: string | null;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          tenant_id: string;
          parent_id: string | null;
          name: string;
          slug: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          parent_id?: string | null;
          name: string;
          slug: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          parent_id?: string | null;
          name?: string;
          slug?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
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
          status: "draft" | "active" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          category_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          price: number;
          compare_at_price?: number | null;
          sku?: string | null;
          stock?: number;
          track_inventory?: boolean;
          status?: "draft" | "active" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          category_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          compare_at_price?: number | null;
          sku?: string | null;
          stock?: number;
          track_inventory?: boolean;
          status?: "draft" | "active" | "archived";
          created_at?: string;
          updated_at?: string;
        };
      };
      product_images: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          url: string;
          alt: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          url: string;
          alt?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string;
          url?: string;
          alt?: string | null;
          position?: number;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          name: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          name?: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string | null;
          order_number: string;
          status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
          payment_status: "unpaid" | "paid" | "refunded";
          payment_method: string;
          subtotal: number;
          shipping_amount: number;
          total: number;
          shipping_address: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          customer_id?: string | null;
          order_number?: string;
          status?: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
          payment_status?: "unpaid" | "paid" | "refunded";
          payment_method?: string;
          subtotal?: number;
          shipping_amount?: number;
          total?: number;
          shipping_address?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          customer_id?: string | null;
          order_number?: string;
          status?: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
          payment_status?: "unpaid" | "paid" | "refunded";
          payment_method?: string;
          subtotal?: number;
          shipping_amount?: number;
          total?: number;
          shipping_address?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          tenant_id: string;
          order_id: string;
          product_id: string | null;
          name: string;
          sku: string | null;
          unit_price: number;
          quantity: number;
          line_total: number;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          order_id: string;
          product_id?: string | null;
          name: string;
          sku?: string | null;
          unit_price: number;
          quantity: number;
          line_total: number;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          order_id?: string;
          product_id?: string | null;
          name?: string;
          sku?: string | null;
          unit_price?: number;
          quantity?: number;
          line_total?: number;
        };
      };
      order_events: {
        Row: {
          id: string;
          tenant_id: string;
          order_id: string;
          status: string;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          order_id: string;
          status: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          order_id?: string;
          status?: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      notification_tokens: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string | null;
          token: string;
          platform: "web" | "android" | "ios";
          created_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id?: string | null;
          token: string;
          platform?: "web" | "android" | "ios";
          created_at?: string;
          last_seen_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tenant_id?: string | null;
          token?: string;
          platform?: "web" | "android" | "ios";
          created_at?: string;
          last_seen_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          tenant_id: string | null;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
      rate_limit_buckets: {
        Row: {
          key: string;
          count: number;
          reset_at: string;
        };
        Insert: {
          key: string;
          count?: number;
          reset_at: string;
        };
        Update: {
          key?: string;
          count?: number;
          reset_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_tenant: {
        Args: {
          p_name: string;
          p_slug: string;
          p_plan_code: string;
        };
        Returns: string;
      };
      storefront_tenant: {
        Args: {
          p_slug?: string | null;
          p_domain?: string | null;
        };
        Returns: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          settings: Json;
          is_open: boolean;
        }[];
      };
      tenant_usage: {
        Args: {
          p_tenant: string;
        };
        Returns: {
          active: boolean;
          plan_name?: string;
          status?: string;
          period_end?: string;
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
        };
      };
      check_rate_limit: {
        Args: {
          p_key: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      admin_set_tenant_status: {
        Args: {
          p_tenant: string;
          p_status: string;
        };
        Returns: void;
      };
      place_order: {
        Args: {
          p_tenant: string;
          p_items: Json;
          p_shipping: Json;
          p_notes?: string | null;
        };
        Returns: string;
      };
      cancel_order: {
        Args: {
          p_order: string;
          p_reason?: string | null;
        };
        Returns: void;
      };
      update_order_status: {
        Args: {
          p_order: string;
          p_status: string;
          p_note?: string | null;
        };
        Returns: void;
      };
      update_order_payment_status: {
        Args: {
          p_order: string;
          p_payment_status: string;
          p_note?: string | null;
        };
        Returns: void;
      };
      is_platform_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_tenant_member: {
        Args: {
          p_tenant: string;
          p_roles?: string[] | null;
        };
        Returns: boolean;
      };
      tenant_is_open: {
        Args: {
          p_tenant: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
