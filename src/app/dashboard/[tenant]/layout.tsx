import * as React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import { getUserTenants } from "@/features/tenants/queries";
import { UserNav } from "@/components/shared/UserNav";
import { SubscriptionBanner } from "@/features/subscriptions/components/SubscriptionBanner";
import {
  getUserNotifications,
  getUnreadNotificationsCount,
} from "@/features/notifications/queries";
import { EnableNotifications } from "@/features/notifications/components/EnableNotifications";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import {
  DashboardSidebar,
  MobileNavSheet,
} from "@/features/tenants/components/DashboardSidebar";

interface TenantData {
  id: string;
  slug: string;
  name: string;
  status: "active" | "suspended";
  custom_domain: string | null;
  logo_url: string | null;
}

interface MemberQueryResult {
  role: string;
  tenants: TenantData;
}

interface SubQueryResult {
  status?: string;
  trial_ends_at?: string | null;
  plans?: { name: string } | { name: string }[] | null;
}

export const dynamic = "force-dynamic";

export default async function TenantDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const user = await requireUser();
  const { tenant: slug } = await params;

  const supabase = await createClient();

  // 1. Resolve tenant membership. Non-members -> notFound()
  const [{ data: memberData, error }, userStores] = await Promise.all([
    supabase
      .from("tenant_members")
      .select(`
        role,
        tenants!inner (
          id,
          slug,
          name,
          status,
          custom_domain,
          logo_url
        )
      `)
      .eq("tenants.slug", slug)
      .eq("user_id", user.id)
      .maybeSingle(),
    getUserTenants(user.id),
  ]);

  const tenantMember = memberData as unknown as MemberQueryResult | null;

  if (error || !tenantMember || !tenantMember.tenants) {
    notFound();
  }

  const tenant = tenantMember.tenants;
  const isStaff = tenantMember.role === "staff";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  const [{ data: subData }, notifications, unreadCount] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(`
        status,
        trial_ends_at,
        plans (
          name
        )
      `)
      .eq("tenant_id", tenant.id)
      .maybeSingle(),
    getUserNotifications(tenant.id, 20),
    getUnreadNotificationsCount(tenant.id),
  ]);

  const sub = subData as unknown as SubQueryResult | null;
  const planData = sub?.plans;
  const planName = Array.isArray(planData) ? planData[0]?.name : planData?.name;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop Sticky Left Sidebar Menu */}
      <DashboardSidebar
        slug={slug}
        storeName={tenant.name}
        storeStatus={tenant.status}
        logoUrl={tenant.logo_url}
        stores={userStores}
        isStaff={isStaff}
        rootDomain={rootDomain}
        planName={planName}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Subscription Banner */}
        <SubscriptionBanner
          status={sub?.status || "incomplete"}
          trialEndsAt={sub?.trial_ends_at}
          tenantSlug={slug}
        />

        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu trigger */}
            <MobileNavSheet
              slug={slug}
              storeName={tenant.name}
              storeStatus={tenant.status}
              logoUrl={tenant.logo_url}
              stores={userStores}
              isStaff={isStaff}
              rootDomain={rootDomain}
              planName={planName}
            />

            {/* Header Title / Breadcrumb */}
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-foreground truncate">
                Dashboard
              </span>
            </div>
          </div>

          {/* Right Actions: Store link, Notifications, User */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              href={`http://${slug}.${rootDomain}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground border border-border/80 hover:bg-muted/60 transition-colors px-2.5 py-1 rounded-md hidden md:inline-flex items-center gap-1.5 font-medium shadow-2xs"
            >
              <span>View store</span>
              <span className="text-[10px]">↗</span>
            </a>

            <EnableNotifications tenantId={tenant.id} />
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              tenantId={tenant.id}
            />
            <UserNav
              user={{
                email: user.email,
                fullName: (user.user_metadata?.full_name as string) || null,
              }}
            />
          </div>
        </header>

        {/* Main Tenant Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
