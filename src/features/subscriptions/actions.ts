"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/features/auth/queries";
import {
  createRazorpaySubscription,
  cancelRazorpaySubscription,
  updateRazorpaySubscription,
  syncPlanToRazorpay,
} from "@/lib/billing/razorpay";
import type { ActionResult } from "@/lib/errors";

export interface CheckoutSessionData {
  subscriptionId: string;
  keyId: string;
  amount: number;
  currency: string;
  name: string;
  email: string;
  planName: string;
}

/**
 * Initiates Razorpay checkout for a tenant subscription.
 * Only the store owner is permitted to perform billing checkout.
 */
export async function startCheckout(
  tenantId: string
): Promise<ActionResult<CheckoutSessionData>> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "You must be signed in to manage subscription billing.",
    };
  }

  const supabase = await createClient();

  // 1. Verify owner role
  const { data: memberData } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  const member = memberData as unknown as { role: string } | null;

  if (!member || member.role !== "owner") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only the store owner is authorized to manage subscription billing.",
    };
  }

  // 2. Load the tenant's current subscription and associated plan
  const { data: subData, error: subErr } = await supabase
    .from("subscriptions")
    .select(`
      id,
      tenant_id,
      plan_id,
      status,
      trial_ends_at,
      razorpay_subscription_id,
      plans (
        id,
        code,
        name,
        description,
        price_paise,
        billing_interval,
        razorpay_plan_id
      ),
      tenants (
        id,
        name
      )
    `)
    .eq("tenant_id", tenantId)
    .single();

  interface SubscriptionQueryResult {
    id: string;
    tenant_id: string;
    plan_id: string;
    status: string;
    trial_ends_at: string | null;
    razorpay_subscription_id: string | null;
    plans:
      | {
          id: string;
          code: string;
          name: string;
          description: string | null;
          price_paise: number;
          billing_interval: string;
          razorpay_plan_id: string | null;
        }
      | {
          id: string;
          code: string;
          name: string;
          description: string | null;
          price_paise: number;
          billing_interval: string;
          razorpay_plan_id: string | null;
        }[]
      | null;
    tenants: { id: string; name: string } | { id: string; name: string }[] | null;
  }

  const subscription = subData as unknown as SubscriptionQueryResult | null;

  if (subErr || !subscription) {
    return {
      ok: false,
      code: "SUBSCRIPTION_NOT_FOUND",
      message: "Active subscription record could not be loaded for this store.",
    };
  }

  const plan = Array.isArray(subscription.plans)
    ? subscription.plans[0]
    : subscription.plans;
  const tenant = Array.isArray(subscription.tenants)
    ? subscription.tenants[0]
    : subscription.tenants;

  if (!plan || plan.price_paise <= 0) {
    return {
      ok: false,
      code: "FREE_PLAN",
      message: "This plan is free and does not require payment checkout.",
    };
  }

  // 3. Ensure Razorpay plan ID exists
  let rzpPlanId = plan.razorpay_plan_id;
  if (!rzpPlanId) {
    rzpPlanId = await syncPlanToRazorpay({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      price_paise: plan.price_paise,
      billing_interval: plan.billing_interval,
    });
  }

  if (!rzpPlanId) {
    return {
      ok: false,
      code: "RAZORPAY_CONFIG_ERROR",
      message: "Unable to provision Razorpay plan. Please check Razorpay API keys.",
    };
  }

  // 4. Create Razorpay Subscription
  // If customer is currently in free trial, set start_at to future trial_ends_at timestamp
  let startAtUnix: number | null = null;
  if (subscription.trial_ends_at) {
    const trialDate = new Date(subscription.trial_ends_at);
    const now = new Date();
    if (trialDate.getTime() > now.getTime()) {
      startAtUnix = Math.floor(trialDate.getTime() / 1000);
    }
  }

  const totalCount = plan.billing_interval === "year" ? 10 : 120;

  try {
    const rzpSub = await createRazorpaySubscription({
      planId: rzpPlanId,
      totalCount,
      startAt: startAtUnix,
      notes: {
        tenant_id: tenantId,
        subscription_id: subscription.id,
      },
    });

    type SubscriptionsTableUpdate = {
      update: (vals: Record<string, unknown>) => {
        eq: (col: string, val: unknown) => Promise<unknown>;
      };
    };

    // 5. Save razorpay_subscription_id to subscription row via service role
    const admin = createAdminClient();
    await (admin.from("subscriptions") as unknown as SubscriptionsTableUpdate)
      .update({ razorpay_subscription_id: rzpSub.id })
      .eq("id", subscription.id);

    const keyId =
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";

    return {
      ok: true,
      data: {
        subscriptionId: rzpSub.id,
        keyId,
        amount: plan.price_paise,
        currency: "INR",
        name: tenant?.name || "Store Subscription",
        email: user.email || "",
        planName: plan.name,
      },
    };
  } catch (err: unknown) {
    console.error("[startCheckout] Razorpay subscription creation failed:", err);
    return {
      ok: false,
      code: "CHECKOUT_FAILED",
      message:
        (err as { message?: string })?.message ||
        "Failed to initiate Razorpay subscription checkout.",
    };
  }
}

/**
 * Cancels a subscription at the end of the current billing cycle.
 */
export async function cancelSubscriptionAction(
  tenantId: string
): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "Authentication required.",
    };
  }

  const supabase = await createClient();

  const { data: memberData } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  const member = memberData as unknown as { role: string } | null;

  if (!member || member.role !== "owner") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only the store owner is authorized to cancel billing.",
    };
  }

  const { data: subData } = await supabase
    .from("subscriptions")
    .select("id, razorpay_subscription_id")
    .eq("tenant_id", tenantId)
    .single();

  const sub = subData as unknown as {
    id: string;
    razorpay_subscription_id: string | null;
  } | null;

  if (!sub) {
    return {
      ok: false,
      code: "SUBSCRIPTION_NOT_FOUND",
      message: "Subscription record not found.",
    };
  }

  // If connected to a Razorpay subscription, schedule cancellation at cycle end
  if (sub.razorpay_subscription_id) {
    try {
      await cancelRazorpaySubscription(sub.razorpay_subscription_id, true);
    } catch (err) {
      console.error("[cancelSubscriptionAction] Razorpay cancel failed:", err);
    }
  }

  // Update cancel_at_period_end in database
  const admin = createAdminClient();
  await (
    admin.from("subscriptions") as unknown as {
      update: (vals: Record<string, unknown>) => {
        eq: (col: string, val: unknown) => Promise<unknown>;
      };
    }
  )
    .update({ cancel_at_period_end: true })
    .eq("id", sub.id);

  revalidatePath(`/dashboard/${tenantId}/billing`);
  return { ok: true, data: undefined };
}

/**
 * Switches a tenant's subscription to a different plan.
 */
export async function changePlanAction(
  tenantId: string,
  newPlanId: string
): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "Authentication required.",
    };
  }

  const supabase = await createClient();

  const { data: memberData } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  const member = memberData as unknown as { role: string } | null;

  if (!member || member.role !== "owner") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only the store owner can change subscription plans.",
    };
  }

  const [{ data: subData }, { data: newPlanData }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("tenant_id", tenantId).single(),
    supabase.from("plans").select("*").eq("id", newPlanId).single(),
  ]);

  interface PlanRow {
    id: string;
    code: string;
    name: string;
    description: string | null;
    price_paise: number;
    billing_interval: string;
    razorpay_plan_id: string | null;
  }

  const sub = subData as unknown as {
    id: string;
    razorpay_subscription_id: string | null;
  } | null;
  const newPlan = newPlanData as unknown as PlanRow | null;

  if (!sub || !newPlan) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Subscription or target plan not found.",
    };
  }

  // Ensure new plan has a Razorpay plan ID if paid
  let newRzpPlanId = newPlan.razorpay_plan_id;
  if (!newRzpPlanId && newPlan.price_paise > 0) {
    newRzpPlanId = await syncPlanToRazorpay({
      id: newPlan.id,
      code: newPlan.code,
      name: newPlan.name,
      description: newPlan.description,
      price_paise: newPlan.price_paise,
      billing_interval: newPlan.billing_interval,
    });
  }

  // If existing subscription has Razorpay ID and target plan is paid, update Razorpay subscription
  if (sub.razorpay_subscription_id && newRzpPlanId) {
    try {
      await updateRazorpaySubscription(
        sub.razorpay_subscription_id,
        newRzpPlanId,
        "now"
      );
    } catch (err) {
      console.warn(
        "[changePlanAction] Direct Razorpay plan update notice (will update DB plan):",
        err
      );
    }
  }

  // Update plan_id in database
  const adminClient = createAdminClient();
  await (
    adminClient.from("subscriptions") as unknown as {
      update: (vals: Record<string, unknown>) => {
        eq: (col: string, val: unknown) => Promise<unknown>;
      };
    }
  )
    .update({ plan_id: newPlan.id })
    .eq("id", sub.id);

  revalidatePath(`/dashboard/${tenantId}/billing`);
  revalidatePath(`/dashboard/${tenantId}`);
  return { ok: true, data: undefined };
}

/**
 * Returns current subscription status for fast client polling after payment modal.
 */
export async function getSubscriptionStatusAction(
  tenantId: string
): Promise<{ status: string; periodEnd: string | null }> {
  const supabase = await createClient();
  const { data: subData } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const sub = subData as unknown as {
    status: string;
    current_period_end: string | null;
  } | null;

  return {
    status: sub?.status || "incomplete",
    periodEnd: sub?.current_period_end || null,
  };
}
