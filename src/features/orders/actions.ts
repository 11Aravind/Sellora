"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDbError, friendlyMessage, type ActionResult } from "@/lib/errors";

export async function vendorCancelOrderAction(
  tenantId: string,
  tenantSlug: string,
  orderId: string,
  reason?: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const { error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: null; error: { message: string } | null }>;
  }).rpc("cancel_order", {
    p_order: orderId,
    p_reason: reason || "Cancelled by store staff",
  });

  if (error) {
    const code = parseDbError(error.message);
    const message = error.message.includes("INVALID_STATE")
      ? "This order cannot be cancelled in its current state."
      : friendlyMessage(code);
    return { ok: false, code, message };
  }

  revalidatePath(`/dashboard/${tenantSlug}/orders`);
  revalidatePath(`/dashboard/${tenantSlug}/orders/${orderId}`);
  revalidatePath(`/dashboard/${tenantSlug}`);
  return { ok: true, data: undefined };
}

export async function vendorUpdateOrderStatusAction(
  tenantId: string,
  tenantSlug: string,
  orderId: string,
  nextStatus: "confirmed" | "shipped" | "delivered",
  note?: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const { error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: null; error: { message: string } | null }>;
  }).rpc("update_order_status", {
    p_order: orderId,
    p_status: nextStatus,
    p_note: note || `Status updated to ${nextStatus}`,
  });

  if (error) {
    const code = parseDbError(error.message);
    const message = error.message.includes("INVALID_STATE")
      ? "Invalid status transition. Orders must follow pending → confirmed → shipped → delivered."
      : friendlyMessage(code);
    return { ok: false, code, message };
  }

  revalidatePath(`/dashboard/${tenantSlug}/orders`);
  revalidatePath(`/dashboard/${tenantSlug}/orders/${orderId}`);
  revalidatePath(`/dashboard/${tenantSlug}`);
  return { ok: true, data: undefined };
}

export async function vendorUpdatePaymentStatusAction(
  tenantId: string,
  tenantSlug: string,
  orderId: string,
  paymentStatus: "pending" | "paid" | "refunded" | "failed",
  note?: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const { error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: null; error: { message: string } | null }>;
  }).rpc("update_order_payment_status", {
    p_order: orderId,
    p_payment_status: paymentStatus,
    p_note: note || `Payment marked as ${paymentStatus}`,
  });

  if (error) {
    const code = parseDbError(error.message);
    return { ok: false, code, message: friendlyMessage(code) };
  }

  revalidatePath(`/dashboard/${tenantSlug}/orders`);
  revalidatePath(`/dashboard/${tenantSlug}/orders/${orderId}`);
  return { ok: true, data: undefined };
}

export async function customerCancelOrderAction(
  orderId: string,
  reason?: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "AUTH_REQUIRED", message: "Please sign in to cancel your order." };
  }

  const { error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: null; error: { message: string } | null }>;
  }).rpc("cancel_order", {
    p_order: orderId,
    p_reason: reason || "Cancelled by customer",
  });

  if (error) {
    const code = parseDbError(error.message);
    const message = error.message.includes("FORBIDDEN")
      ? "Orders can only be cancelled while they are pending."
      : friendlyMessage(code);
    return { ok: false, code, message };
  }

  revalidatePath(`/orders`);
  revalidatePath(`/orders/${orderId}`);
  return { ok: true, data: undefined };
}
