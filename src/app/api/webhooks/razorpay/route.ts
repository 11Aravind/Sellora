import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/billing/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  // 1. Read raw text body for HMAC signature verification
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  const isValid = verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.error("[Razorpay Webhook] Invalid webhook signature detected. Rejecting with 400.");
    return new NextResponse("Invalid webhook signature", { status: 400 });
  }

  interface RazorpayWebhookBody {
    event: string;
    payload?: {
      subscription?: {
        entity?: {
          id?: string;
          current_start?: number;
          current_end?: number;
        };
      };
      payment?: {
        entity?: {
          id?: string;
          amount?: number;
          currency?: string;
          order_id?: string | null;
          subscription_id?: string;
          notes?: {
            subscription_id?: string;
          };
        };
      };
    };
  }

  let eventData: RazorpayWebhookBody;
  try {
    eventData = JSON.parse(rawBody) as RazorpayWebhookBody;
  } catch (err) {
    console.error("[Razorpay Webhook] Failed to parse JSON body:", err);
    return new NextResponse("Malformed JSON", { status: 400 });
  }

  const eventName = eventData.event;
  const subscriptionEntity = eventData.payload?.subscription?.entity;
  const paymentEntity = eventData.payload?.payment?.entity;

  const rzpSubId =
    subscriptionEntity?.id ||
    paymentEntity?.subscription_id ||
    eventData.payload?.payment?.entity?.notes?.subscription_id;

  if (!rzpSubId) {
    // If event does not pertain to a subscription, acknowledge with 200
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  // 2. Find subscription by razorpay_subscription_id using service role
  const { data: subData, error: subErr } = await admin
    .from("subscriptions")
    .select("id, tenant_id, status")
    .eq("razorpay_subscription_id", rzpSubId)
    .maybeSingle();

  const sub = subData as unknown as { id: string; tenant_id: string; status: string } | null;

  if (subErr || !sub) {
    console.warn(
      `[Razorpay Webhook] Subscription not found for Razorpay ID ${rzpSubId}. Acknowledging with 200.`
    );
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    type SubscriptionsUpdate = {
      update: (vals: Record<string, unknown>) => {
        eq: (col: string, val: unknown) => Promise<unknown>;
      };
    };

    type PaymentsUpsert = {
      upsert: (
        vals: Record<string, unknown>,
        opts: { onConflict: string; ignoreDuplicates?: boolean }
      ) => Promise<unknown>;
    };

    const subsTable = admin.from("subscriptions") as unknown as SubscriptionsUpdate;
    const paymentsTable = admin.from("subscription_payments") as unknown as PaymentsUpsert;

    // 3. Map events to status updates
    switch (eventName) {
      case "subscription.authenticated":
        // Initial authorization; keep trialing or incomplete status
        console.log(`[Razorpay Webhook] Subscription authenticated: ${sub.id}`);
        break;

      case "subscription.activated":
      case "subscription.charged": {
        const periodStart = subscriptionEntity?.current_start
          ? new Date(subscriptionEntity.current_start * 1000).toISOString()
          : new Date().toISOString();
        const periodEnd = subscriptionEntity?.current_end
          ? new Date(subscriptionEntity.current_end * 1000).toISOString()
          : null;

        await subsTable
          .update({
            status: "active",
            current_period_start: periodStart,
            current_period_end: periodEnd,
          })
          .eq("id", sub.id);

        // Record payment transaction if payment entity exists
        if (paymentEntity?.id) {
          const paymentAmount = paymentEntity.amount || 0;
          await paymentsTable.upsert(
            {
              tenant_id: sub.tenant_id,
              subscription_id: sub.id,
              amount_paise: paymentAmount,
              currency: paymentEntity.currency || "INR",
              status: "paid",
              razorpay_payment_id: paymentEntity.id,
              razorpay_order_id: paymentEntity.order_id || null,
            },
            {
              onConflict: "razorpay_payment_id",
              ignoreDuplicates: true,
            }
          );
        }
        break;
      }

      case "payment.failed": {
        if (paymentEntity?.id) {
          await paymentsTable.upsert(
            {
              tenant_id: sub.tenant_id,
              subscription_id: sub.id,
              amount_paise: paymentEntity.amount || 0,
              currency: paymentEntity.currency || "INR",
              status: "failed",
              razorpay_payment_id: paymentEntity.id,
              razorpay_order_id: paymentEntity.order_id || null,
            },
            {
              onConflict: "razorpay_payment_id",
              ignoreDuplicates: true,
            }
          );
        }
        break;
      }

      case "subscription.pending":
      case "subscription.halted":
        await subsTable
          .update({ status: "past_due" })
          .eq("id", sub.id);
        break;

      case "subscription.cancelled":
        // Customer retains access until current_period_end
        await subsTable
          .update({ status: "cancelled", cancel_at_period_end: true })
          .eq("id", sub.id);
        break;

      case "subscription.completed":
        await subsTable
          .update({ status: "expired" })
          .eq("id", sub.id);
        break;

      default:
        console.log(`[Razorpay Webhook] Unhandled event type: ${eventName}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Razorpay Webhook] Processing error:", err);
    return NextResponse.json({ received: true, error: true });
  }
}
