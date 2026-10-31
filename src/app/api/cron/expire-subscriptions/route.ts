import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  // 1. Verify Authorization Bearer token against CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    type UpdateQuery = {
      update: (vals: Record<string, unknown>) => {
        eq: (col: string, val: unknown) => {
          lt: (col: string, val: unknown) => Promise<{ count: number | null; error: Error | null }>;
        };
      };
    };

    // 2. Set 'expired' for trialing subscriptions whose trial_ends_at has passed
    const { count: expiredTrials, error: trialErr } = await (
      admin.from("subscriptions") as unknown as UpdateQuery
    )
      .update({ status: "expired" })
      .eq("status", "trialing")
      .lt("trial_ends_at", now);

    if (trialErr) {
      console.error("[Cron expire-subscriptions] Error expiring trials:", trialErr);
    }

    // 3. Set 'expired' for incomplete subscriptions older than 7 days
    const { count: expiredIncomplete, error: incErr } = await (
      admin.from("subscriptions") as unknown as UpdateQuery
    )
      .update({ status: "expired" })
      .eq("status", "incomplete")
      .lt("created_at", sevenDaysAgo);

    if (incErr) {
      console.error("[Cron expire-subscriptions] Error expiring incomplete:", incErr);
    }

    return NextResponse.json({
      success: true,
      expiredTrials: expiredTrials || 0,
      expiredIncomplete: expiredIncomplete || 0,
      timestamp: now,
    });
  } catch (err) {
    console.error("[Cron expire-subscriptions] Unexpected error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
