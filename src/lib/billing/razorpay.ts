import "server-only";

import crypto from "crypto";
import Razorpay from "razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

let razorpayInstance: Razorpay | null = null;

/**
 * Returns a singleton instance of the Razorpay SDK client.
 */
export function getRazorpayClient(): Razorpay {
  if (razorpayInstance) return razorpayInstance;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment variables."
    );
  }

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
}

/**
 * Verifies Razorpay webhook signature using HMAC-SHA256 with timingSafeEqual
 * to eliminate timing attack vulnerabilities.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | null | undefined = process.env.RAZORPAY_WEBHOOK_SECRET
): boolean {
  if (!rawBody || !signature || !secret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    console.error("[verifyWebhookSignature] Error verifying signature:", err);
    return false;
  }
}

/**
 * Syncs a plan to Razorpay when price_paise > 0.
 * Razorpay plans are immutable: if price or interval changes, a new Razorpay
 * plan is created and its ID saved back to the database.
 */
export async function syncPlanToRazorpay(plan: {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
  price_paise: number;
  billing_interval: string;
  razorpay_plan_id?: string | null;
}): Promise<string | null> {
  if (plan.price_paise <= 0) {
    return null; // Free plans do not require a Razorpay plan
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.warn(
      "[syncPlanToRazorpay] Skipping Razorpay sync: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured."
    );
    return null;
  }

  try {
    const rzp = getRazorpayClient();
    const period = plan.billing_interval === "year" ? "yearly" : "monthly";

    // Create a new Razorpay plan
    const rzpPlan = await rzp.plans.create({
      period,
      interval: 1,
      item: {
        name: plan.name,
        amount: plan.price_paise,
        currency: "INR",
        description: plan.description || `${plan.name} (${period})`,
      },
      notes: {
        code: plan.code,
      },
    });

    const newRzpPlanId = rzpPlan.id;

    // Save razorpay_plan_id to Supabase using service-role client
    if (plan.id) {
      const admin = createAdminClient();
      await (
        admin.from("plans") as unknown as {
          update: (vals: Record<string, unknown>) => {
            eq: (col: string, val: unknown) => Promise<unknown>;
          };
        }
      )
        .update({ razorpay_plan_id: newRzpPlanId })
        .eq("id", plan.id);
    }

    console.log(
      `[syncPlanToRazorpay] Created Razorpay plan ${newRzpPlanId} for "${plan.code}" (${plan.price_paise} paise)`
    );

    return newRzpPlanId;
  } catch (err) {
    console.error(`[syncPlanToRazorpay] Failed to sync plan "${plan.code}":`, err);
    return null;
  }
}

interface RazorpaySubscriptionsApi {
  create: (params: Record<string, unknown>) => Promise<{ id: string }>;
  cancel: (id: string, cancelAtCycleEnd: boolean) => Promise<unknown>;
  update: (id: string, params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Creates a Razorpay Subscription.
 * If the tenant is currently in a free trial, start_at is set to trial_ends_at
 * so the customer's first charge is deferred until the trial expires.
 */
export async function createRazorpaySubscription({
  planId,
  totalCount = 120,
  startAt,
  notes,
}: {
  planId: string;
  totalCount?: number;
  startAt?: number | null; // Unix timestamp in seconds
  notes?: Record<string, string>;
}): Promise<{ id: string }> {
  const rzp = getRazorpayClient();
  const subsApi = rzp.subscriptions as unknown as RazorpaySubscriptionsApi;

  const options: Record<string, unknown> = {
    plan_id: planId,
    total_count: totalCount,
    quantity: 1,
    customer_notify: 1,
    notes: notes || {},
  };

  // If a future start_at timestamp is provided (for active trials), set start_at
  const nowUnix = Math.floor(Date.now() / 1000);
  if (startAt && startAt > nowUnix) {
    options.start_at = startAt;
  }

  const sub = await subsApi.create(options);
  return { id: sub.id };
}

/**
 * Cancels a subscription in Razorpay at period end or immediately.
 */
export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd = true
): Promise<void> {
  const rzp = getRazorpayClient();
  const subsApi = rzp.subscriptions as unknown as RazorpaySubscriptionsApi;
  await subsApi.cancel(subscriptionId, cancelAtCycleEnd);
}

/**
 * Updates a subscription to a new Razorpay plan.
 */
export async function updateRazorpaySubscription(
  subscriptionId: string,
  newPlanId: string,
  scheduleChangeAt: "now" | "cycle_end" = "now"
): Promise<void> {
  const rzp = getRazorpayClient();
  const subsApi = rzp.subscriptions as unknown as RazorpaySubscriptionsApi;
  await subsApi.update(subscriptionId, {
    plan_id: newPlanId,
    schedule_change_at: scheduleChangeAt,
  });
}
