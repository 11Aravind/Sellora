"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/features/auth/queries";
import { planFormSchema, type PlanFormInput } from "./schemas";
import type { ActionResult } from "@/lib/errors";
import type { Database, Json } from "@/types/database";

import { syncPlanToRazorpay } from "@/lib/billing/razorpay";

type PlanInsert = Database["public"]["Tables"]["plans"]["Insert"];
type PlanUpdate = Database["public"]["Tables"]["plans"]["Update"];


/**
 * Creates a new subscription plan with usage limits and marketing features.
 */
export async function createPlanAction(
  data: PlanFormInput
): Promise<ActionResult<{ id: string }>> {
  const admin = await isPlatformAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You are not authorized to perform super-admin operations.",
    };
  }

  const parsed = planFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid plan data.",
    };
  }

  const supabase = await createClient();
  const pricePaise = Math.round(parsed.data.priceRupees * 100);

  const payload: PlanInsert = {
    code: parsed.data.code.trim().toLowerCase(),
    name: parsed.data.name.trim(),
    description: parsed.data.description?.trim() || null,
    billing_interval: parsed.data.billingInterval,
    price_paise: pricePaise,
    trial_days: parsed.data.trialDays,
    max_products: parsed.data.maxProducts,
    max_staff: parsed.data.maxStaff,
    max_orders_per_month: parsed.data.maxOrdersPerMonth,
    custom_domain_allowed: parsed.data.customDomainAllowed,
    features: parsed.data.features as unknown as Json,
    sort_order: parsed.data.sortOrder,
    is_active: parsed.data.isActive,
  };

  const { data: newPlan, error } = await (supabase
    .from("plans") as unknown as {
      insert: (p: PlanInsert) => {
        select: (cols: string) => {
          single: () => Promise<{ data: { id: string; code: string; name: string; price_paise: number; billing_interval: string } | null; error: Error | null }>;
        };
      };
    })
    .insert(payload)
    .select("id, code, name, price_paise, billing_interval")
    .single();

  if (error || !newPlan) {
    return {
      ok: false,
      code: "DB_ERROR",
      message: error?.message || "Failed to create subscription plan.",
    };
  }

  // Hook point: sync to payment gateway if paid plan
  if (pricePaise > 0) {
    await syncPlanToRazorpay(newPlan);
  }

  revalidatePath("/super-admin/plans");
  revalidatePath("/onboarding");
  revalidatePath("/pricing");

  return {
    ok: true,
    data: { id: newPlan.id },
  };
}

/**
 * Updates an existing subscription plan. Plan code is immutable.
 */
export async function updatePlanAction(
  planId: string,
  data: PlanFormInput
): Promise<ActionResult<{ id: string }>> {
  const admin = await isPlatformAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You are not authorized to perform super-admin operations.",
    };
  }

  const parsed = planFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid plan data.",
    };
  }

  const supabase = await createClient();
  const pricePaise = Math.round(parsed.data.priceRupees * 100);

  const payload: PlanUpdate = {
    name: parsed.data.name.trim(),
    description: parsed.data.description?.trim() || null,
    billing_interval: parsed.data.billingInterval,
    price_paise: pricePaise,
    trial_days: parsed.data.trialDays,
    max_products: parsed.data.maxProducts,
    max_staff: parsed.data.maxStaff,
    max_orders_per_month: parsed.data.maxOrdersPerMonth,
    custom_domain_allowed: parsed.data.customDomainAllowed,
    features: parsed.data.features as unknown as Json,
    sort_order: parsed.data.sortOrder,
    is_active: parsed.data.isActive,
  };

  const { data: updatedPlan, error } = await (supabase
    .from("plans") as unknown as {
      update: (p: PlanUpdate) => {
        eq: (col: string, val: string) => {
          select: (cols: string) => {
            single: () => Promise<{ data: { id: string; code: string; name: string; price_paise: number; billing_interval: string } | null; error: Error | null }>;
          };
        };
      };
    })
    .update(payload)
    .eq("id", planId)
    .select("id, code, name, price_paise, billing_interval")
    .single();

  if (error || !updatedPlan) {
    return {
      ok: false,
      code: "DB_ERROR",
      message: error?.message || "Failed to update subscription plan.",
    };
  }

  // Hook point: sync to payment gateway if paid plan
  if (pricePaise > 0) {
    await syncPlanToRazorpay(updatedPlan);
  }

  revalidatePath("/super-admin/plans");
  revalidatePath("/onboarding");
  revalidatePath("/pricing");

  return {
    ok: true,
    data: { id: updatedPlan.id },
  };
}

/**
 * Toggles a plan's active status.
 */
export async function togglePlanStatusAction(
  planId: string,
  isActive: boolean
): Promise<ActionResult<void>> {
  const admin = await isPlatformAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You are not authorized to perform super-admin operations.",
    };
  }

  const supabase = await createClient();
  const { error } = await (supabase
    .from("plans") as unknown as {
      update: (p: PlanUpdate) => {
        eq: (col: string, val: string) => Promise<{ error: Error | null }>;
      };
    })
    .update({ is_active: isActive })
    .eq("id", planId);

  if (error) {
    return {
      ok: false,
      code: "DB_ERROR",
      message: error.message,
    };
  }

  revalidatePath("/super-admin/plans");
  revalidatePath("/onboarding");
  return { ok: true, data: undefined };
}

/**
 * Deletes a plan only if no subscriptions reference it.
 * Otherwise advises the user to deactivate instead.
 */
export async function deletePlanAction(
  planId: string
): Promise<ActionResult<void>> {
  const admin = await isPlatformAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You are not authorized to perform super-admin operations.",
    };
  }

  const supabase = await createClient();

  // 1. Check if any subscriptions reference this plan
  const { count, error: countErr } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", planId);

  if (countErr) {
    return {
      ok: false,
      code: "DB_ERROR",
      message: countErr.message,
    };
  }

  if (count && count > 0) {
    return {
      ok: false,
      code: "FOREIGN_KEY_VIOLATION",
      message:
        "This plan cannot be deleted because active or past store subscriptions reference it. Please deactivate the plan instead.",
    };
  }

  // 2. Perform delete
  const { error: delErr } = await supabase
    .from("plans")
    .delete()
    .eq("id", planId);

  if (delErr) {
    return {
      ok: false,
      code: "DB_ERROR",
      message: delErr.message,
    };
  }

  revalidatePath("/super-admin/plans");
  revalidatePath("/onboarding");
  return { ok: true, data: undefined };
}
