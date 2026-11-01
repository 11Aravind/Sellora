import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CreditCard,
  FolderTree,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import { requireUser } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import { getUserTenants } from "@/features/tenants/queries";
import { StoreSwitcher } from "@/features/tenants/components/StoreSwitcher";
import { UserNav } from "@/components/shared/UserNav";
import { Badge } from "@/components/ui/badge";
import { SubscriptionBanner } from "@/features/subscriptions/components/SubscriptionBanner";

interface TenantData {
  id: string;
  slug: string;
  name: string;
  status: "active" | "suspended";
  custom_domain: string | null;
}

interface MemberQueryResult {
  role: string;
  tenants: TenantData;
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
          custom_domain
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
  const isSuspended = tenant.status === "suspended";
  const isStaff = tenantMember.role === "staff";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  // Role-aware menu: staff cannot see Team, Billing, or Settings
  const allNavItems = [
    { label: "Overview", href: `/dashboard/${slug}`, icon: LayoutDashboard, staffAllowed: true },
    { label: "Products", href: `/dashboard/${slug}/products`, icon: Package, staffAllowed: true },
    { label: "Categories", href: `/dashboard/${slug}/categories`, icon: FolderTree, staffAllowed: true },
    { label: "Orders", href: `/dashboard/${slug}/orders`, icon: ShoppingCart, staffAllowed: true },
    { label: "Team", href: `/dashboard/${slug}/team`, icon: Users, staffAllowed: false },
    { label: "Billing", href: `/dashboard/${slug}/billing`, icon: CreditCard, staffAllowed: false },
    { label: "Settings", href: `/dashboard/${slug}/settings`, icon: Settings, staffAllowed: false },
  ];

  const navItems = allNavItems.filter((item) => (isStaff ? item.staffAllowed : true));

  const { data: subData } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const sub = subData as { status?: string; trial_ends_at?: string | null } | null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Subscription Banner */}
      <SubscriptionBanner
        status={sub?.status || "incomplete"}
        trialEndsAt={sub?.trial_ends_at}
        tenantSlug={slug}
      />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StoreSwitcher currentSlug={slug} stores={userStores} />

            <Badge variant={isSuspended ? "destructive" : "outline"} className="text-xs">
              {tenant.status}
            </Badge>

            <a
              href={`http://${slug}.${rootDomain}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors hidden sm:inline-block font-medium"
            >
              View store ↗
            </a>
          </div>

          <div className="flex items-center gap-3">
            <UserNav
              user={{
                email: user.email,
                fullName: (user.user_metadata?.full_name as string) || null,
              }}
            />
          </div>
        </div>

        {/* Secondary Sub-navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto pt-3 border-t border-border/40 mt-3 text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 text-xs"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main Tenant Content */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
