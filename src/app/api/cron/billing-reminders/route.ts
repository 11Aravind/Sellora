import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyTenant } from "@/features/notifications/send";

/**
 * Checks if a notification of a specific type has already been dispatched
 * to the tenant within the past given hours (default 24h).
 */
async function hasRecentNotification(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  type: string,
  hours = 24
): Promise<boolean> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("notifications")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("type", type)
    .gte("created_at", since)
    .limit(1);

  return Boolean(data && data.length > 0);
}

export async function GET(request: Request) {
  // 1. Authenticate with Bearer CRON_SECRET if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const now = Date.now();
  const stats = {
    trials3dSent: 0,
    trials1dSent: 0,
    pastDueSent: 0,
    limit80Sent: 0,
    limit100Sent: 0,
  };

  try {
    // -------------------------------------------------------------------------
    // 1. Trial Ending Alerts (3 days and 1 day)
    // -------------------------------------------------------------------------
    const { data: trialingSubs } = await admin
      .from("subscriptions")
      .select("id, tenant_id, trial_ends_at, tenants(slug)")
      .eq("status", "trialing")
      .not("trial_ends_at", "is", null);

    interface SubWithTenant {
      id: string;
      tenant_id: string;
      trial_ends_at: string;
      tenants: { slug: string } | null;
    }

    if (trialingSubs) {
      for (const sub of trialingSubs as unknown as SubWithTenant[]) {
        const tenantSlug = sub.tenants?.slug;
        const billingUrl = tenantSlug
          ? `http://${rootDomain}/dashboard/${tenantSlug}/billing`
          : undefined;
        const diffMs = new Date(sub.trial_ends_at).getTime() - now;

        // Within 1 day (0 < diffMs <= 24h)
        if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
          const alreadySent = await hasRecentNotification(
            admin,
            sub.tenant_id,
            "trial.ending_soon_1d"
          );
          if (!alreadySent) {
            await notifyTenant({
              tenantId: sub.tenant_id,
              roles: ["owner"],
              type: "trial.ending_soon_1d",
              title: "Free Trial Ends in 24 Hours",
              body: "Your trial ends tomorrow. Choose a subscription plan to keep your store active.",
              link: billingUrl,
            });
            stats.trials1dSent++;
          }
        }
        // Between 1 and 3 days (24h < diffMs <= 72h)
        else if (diffMs > 24 * 60 * 60 * 1000 && diffMs <= 72 * 60 * 60 * 1000) {
          const alreadySent = await hasRecentNotification(
            admin,
            sub.tenant_id,
            "trial.ending_soon_3d"
          );
          if (!alreadySent) {
            await notifyTenant({
              tenantId: sub.tenant_id,
              roles: ["owner"],
              type: "trial.ending_soon_3d",
              title: "Free Trial Ending in 3 Days",
              body: "Your free trial ends in 3 days. Select a subscription plan to avoid store disruption.",
              link: billingUrl,
            });
            stats.trials3dSent++;
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // 2. Past Due Subscriptions Alert
    // -------------------------------------------------------------------------
    const { data: pastDueSubs } = await admin
      .from("subscriptions")
      .select("id, tenant_id, tenants(slug)")
      .eq("status", "past_due");

    interface PastDueSub {
      id: string;
      tenant_id: string;
      tenants: { slug: string } | null;
    }

    if (pastDueSubs) {
      for (const sub of pastDueSubs as unknown as PastDueSub[]) {
        const tenantSlug = sub.tenants?.slug;
        const billingUrl = tenantSlug
          ? `http://${rootDomain}/dashboard/${tenantSlug}/billing`
          : undefined;

        const alreadySent = await hasRecentNotification(
          admin,
          sub.tenant_id,
          "billing.past_due"
        );
        if (!alreadySent) {
          await notifyTenant({
            tenantId: sub.tenant_id,
            roles: ["owner"],
            type: "billing.past_due",
            title: "Subscription Renewal Past Due",
            body: "Your subscription renewal payment is past due. Please update your payment method to avoid store suspension.",
            link: billingUrl,
          });
          stats.pastDueSent++;
        }
      }
    }

    // -------------------------------------------------------------------------
    // 3. Product Usage Capacity Alerts (80% and 100%)
    // -------------------------------------------------------------------------
    const { data: activeTenants } = await admin
      .from("tenants")
      .select("id, slug, status")
      .eq("status", "active");

    interface TenantRow {
      id: string;
      slug: string;
      status: string;
    }

    const tenantList = (activeTenants || []) as unknown as TenantRow[];

    for (const tenant of tenantList) {
        // Query active subscription and plan max_products
        const { data: subData } = await admin
          .from("subscriptions")
          .select("plan_id, plans(max_products)")
          .eq("tenant_id", tenant.id)
          .maybeSingle();

        const plan = (subData as unknown as { plans?: { max_products: number | null } })
          ?.plans;

        if (plan && plan.max_products !== null && plan.max_products > 0) {
          const maxProducts = plan.max_products;

          // Count active/draft products
          const { count } = await admin
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id)
            .neq("status", "archived");

          const currentCount = count || 0;
          const ratio = currentCount / maxProducts;
          const billingUrl = `http://${rootDomain}/dashboard/${tenant.slug}/billing`;

          // 100% capacity reached
          if (ratio >= 1.0) {
            const alreadySent = await hasRecentNotification(
              admin,
              tenant.id,
              "limit.products_100"
            );
            if (!alreadySent) {
              await notifyTenant({
                tenantId: tenant.id,
                roles: ["owner", "admin"],
                type: "limit.products_100",
                title: "Product Limit Reached (100%)",
                body: `You have reached the maximum limit of ${maxProducts} products for your current plan. Upgrade to add more products.`,
                link: billingUrl,
              });
              stats.limit100Sent++;
            }
          }
          // 80% capacity threshold reached
          else if (ratio >= 0.8) {
            const alreadySent = await hasRecentNotification(
              admin,
              tenant.id,
              "limit.products_80"
            );
            if (!alreadySent) {
              const pct = Math.round(ratio * 100);
              await notifyTenant({
                tenantId: tenant.id,
                roles: ["owner", "admin"],
                type: "limit.products_80",
                title: `Approaching Product Limit (${pct}%)`,
                body: `You have used ${currentCount} of ${maxProducts} product slots (${pct}%). Upgrade your plan for unlimited catalog expansion.`,
                link: billingUrl,
              });
              stats.limit80Sent++;
            }
          }
        }
      }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    });
  } catch (err) {
    console.error("[Cron billing-reminders] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal processing error" },
      { status: 500 }
    );
  }
}
