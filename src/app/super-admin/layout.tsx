import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  Store,
  ArrowLeft,
  Receipt,
} from "lucide-react";
import { isPlatformAdmin, getCurrentUser } from "@/features/auth/queries";
import { UserNav } from "@/components/shared/UserNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isPlatformAdmin();
  if (!admin) {
    notFound();
  }

  const user = await getCurrentUser();

  const navItems = [
    { label: "Overview", href: "/super-admin", icon: LayoutDashboard },
    { label: "Plans", href: "/super-admin/plans", icon: CreditCard },
    { label: "Stores", href: "/super-admin/stores", icon: Store },
    { label: "Subscriptions", href: "/super-admin/subscriptions", icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="w-full md:w-64 border-r border-border/70 bg-card/40 flex flex-col shrink-0">
        <div className="p-5 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">Super Admin</div>
              <div className="text-[11px] text-muted-foreground font-mono">Platform Console</div>
            </div>
          </div>
          <div className="mt-3">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5">
              Platform Owner
            </Badge>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Switcher link */}
        <div className="p-3 border-t border-border/60 space-y-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Merchant Dashboard</span>
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-border/60 bg-background/95 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Admin Portal</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-xs font-semibold text-foreground">SaaS Commerce Kit</span>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <UserNav
                user={{
                  email: user.email || "",
                  fullName: user.user_metadata?.full_name || null,
                  avatarUrl: user.user_metadata?.avatar_url || null,
                }}
              />
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
