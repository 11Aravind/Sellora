"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyTenant } from "@/features/notifications/send";
import { getCartHydratedProducts } from "./queries";
import type { HydratedCartProduct } from "./types";
import { placeOrderInputSchema, customerAuthSchema, type PlaceOrderInput } from "./schemas";
import { mapPlaceOrderError } from "./errors";

export async function getCartHydratedProductsAction(
  tenantId: string,
  productIds: string[]
): Promise<HydratedCartProduct[]> {
  return getCartHydratedProducts(tenantId, productIds);
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Places an order for the authenticated customer using COD.
 * Calls RPC `place_order(p_tenant, p_items, p_shipping, p_notes)`.
 * p_items MUST ONLY be [{ product_id, quantity }]. We never send prices.
 */
export async function placeOrderAction(input: PlaceOrderInput): Promise<ActionResult<{ orderId: string }>> {
  const parsed = placeOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid order information",
    };
  }

  const { tenantId, items, shipping, notes } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "AUTH_REQUIRED",
      message: "Please sign in to complete your order.",
    };
  }

  // Format p_items strictly as array of { product_id, quantity }
  const p_items = items.map((i) => ({
    product_id: i.productId,
    quantity: i.quantity,
  }));

  // Format shipping JSON
  const p_shipping = {
    name: shipping.fullName,
    phone: shipping.phone,
    address_line_1: shipping.addressLine1,
    address_line_2: shipping.addressLine2 || null,
    city: shipping.city,
    state: shipping.state,
    pin_code: shipping.pinCode,
  };

  const { data: orderId, error } = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: string | null; error: { message: string } | null }>;
    }
  ).rpc("place_order", {
    p_tenant: tenantId,
    p_items,
    p_shipping,
    p_notes: notes || null,
  });

  if (error) {
    console.error("[placeOrderAction] RPC error:", error.message);
    const mapped = mapPlaceOrderError(error.message);
    return {
      success: false,
      error: mapped.code,
      message: mapped.message,
    };
  }

  if (!orderId) {
    return {
      success: false,
      error: "ORDER_FAILED",
      message: "Failed to generate order confirmation. Please check your orders.",
    };
  }

  // Dispatch background notification without delaying the checkout response
  after(async () => {
    try {
      const admin = createAdminClient();
      const { data: orderData } = await admin
        .from("orders")
        .select("id, order_number, total, tenants(slug)")
        .eq("id", orderId)
        .maybeSingle();

      if (orderData) {
        const orderRow = orderData as unknown as {
          id: string;
          order_number: string;
          total: number;
          tenants: { slug: string } | null;
        };
        const tenantSlug = orderRow.tenants?.slug;
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
        const formattedTotal = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(Number(orderRow.total || 0));

        const customerName = shipping.fullName || "Customer";

        await notifyTenant({
          tenantId,
          roles: ["owner", "admin", "staff"],
          type: "order.new",
          title: `New order ${orderRow.order_number}`,
          body: `${formattedTotal} from ${customerName}`,
          link: tenantSlug
            ? `http://${rootDomain}/dashboard/${tenantSlug}/orders/${orderId}`
            : undefined,
        });
      }
    } catch (err) {
      console.error("[placeOrderAction] Notification dispatch error:", err);
    }
  });

  return {
    success: true,
    data: { orderId },
  };
}

/**
 * Customer login action for storefront.
 */
export async function customerLoginAction(
  formData: FormData,
  nextUrl: string = "/orders"
): Promise<ActionResult<{ redirectUrl: string }>> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const parsed = customerAuthSchema.safeParse({ email, password });
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid credentials",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      error: "AUTH_FAILED",
      message: error.message,
    };
  }

  return {
    success: true,
    data: { redirectUrl: nextUrl },
  };
}

/**
 * Customer signup action for storefront.
 */
export async function customerSignupAction(
  formData: FormData,
  nextUrl: string = "/orders"
): Promise<ActionResult<{ redirectUrl: string }>> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "");

  const parsed = customerAuthSchema.safeParse({ email, password, fullName });
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid input",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return {
      success: false,
      error: "SIGNUP_FAILED",
      message: error.message,
    };
  }

  // If email confirmation is required by Supabase configuration
  if (data.session === null && data.user && data.user.identities && data.user.identities.length > 0) {
    return {
      success: true,
      message: "Account created! Please check your email to confirm your account.",
      data: { redirectUrl: `/login?message=check_email&next=${encodeURIComponent(nextUrl)}` },
    };
  }

  return {
    success: true,
    data: { redirectUrl: nextUrl },
  };
}

/**
 * Customer logout action for storefront.
 */
export async function customerLogoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
