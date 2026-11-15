"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  CreditCard,
  Settings,
  ExternalLink,
  Store,
  ChevronRight,
  Menu,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StoreSwitcher, type UserStoreItem } from "./StoreSwitcher";

export interface DashboardSidebarProps {
  slug: string;
  storeName: string;
  storeStatus: string;
  logoUrl?: string | null;
  stores: UserStoreItem[];
  isStaff: boolean;
  rootDomain: string;
  planName?: string;
}

const navGroups = [
  {
    group: "Store",
    items: [
      {
        label: "Overview",
        href: (slug: string) => `/dashboard/${slug}`,
        icon: LayoutDashboard,
        exact: true,
        staffAllowed: true,
      },
      {
        label: "Orders",
        href: (slug: string) => `/dashboard/${slug}/orders`,
        icon: ShoppingCart,
        exact: false,
        staffAllowed: true,
      },
      {
        label: "Products",
        href: (slug: string) => `/dashboard/${slug}/products`,
        icon: Package,
        exact: false,
        staffAllowed: true,
      },
      {
        label: "Categories",
        href: (slug: string) => `/dashboard/${slug}/categories`,
        icon: FolderTree,
        exact: false,
        staffAllowed: true,
      },
    ],
  },
  {
    group: "Settings & Team",
    items: [
      {
        label: "Team Members",
        href: (slug: string) => `/dashboard/${slug}/team`,
        icon: Users,
        exact: false,
        staffAllowed: false,
      },
      {
        label: "Billing & Plans",
        href: (slug: string) => `/dashboard/${slug}/billing`,
        icon: CreditCard,
        exact: false,
        staffAllowed: false,
      },
      {
        label: "Store Settings",
        href: (slug: string) => `/dashboard/${slug}/settings`,
        icon: Settings,
        exact: false,
        staffAllowed: false,
      },
    ],
  },
];

function SidebarNavContent({
  slug,
  storeName,
  storeStatus,
  logoUrl,
  stores,
  isStaff,
  rootDomain,
  planName,
  onItemClick,
}: DashboardSidebarProps & { onItemClick?: () => void }) {
  const pathname = usePathname();
  const storeUrl = `http://${slug}.${rootDomain}`;

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-6">
        {/* Unified Store Selector Header */}
        <div className="p-3 border-b border-border/70 bg-muted/15">
          <StoreSwitcher
            currentSlug={slug}
            stores={stores}
            storeName={storeName}
            storeStatus={storeStatus}
            logoUrl={logoUrl}
            className="w-full"
          />
        </div>

        {/* Navigation Menu Groups */}
        <div className="px-3 space-y-6">
          {navGroups.map((grp) => {
            const visibleItems = grp.items.filter((item) =>
              isStaff ? item.staffAllowed : true
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={grp.group} className="space-y-1">
                <p className="px-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                  {grp.group}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const itemHref = item.href(slug);
                    const Icon = item.icon;
                    const isActive = item.exact
                      ? pathname === itemHref
                      : pathname.startsWith(itemHref);

                    return (
                      <Link
                        key={itemHref}
                        href={itemHref}
                        onClick={onItemClick}
                        className={cn(
                          "group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isActive
                                ? "text-primary-foreground"
                                : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          <span>{item.label}</span>
                        </div>
                        {isActive && <ChevronRight className="h-3 w-3 opacity-70" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Live Store Quick Link & Plan Badge */}
      <div className="p-4 border-t border-border/70 bg-muted/15 space-y-3">
        {planName && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px] font-medium">Plan:</span>
            <Badge variant="secondary" className="text-[11px] font-semibold">
              {planName}
            </Badge>
          </div>
        )}

        <a
          href={storeUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-border/80 bg-background hover:bg-muted/80 text-xs font-semibold text-foreground transition-colors group shadow-2xs"
        >
          <span className="flex items-center gap-2 truncate">
            <Store className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">View Online Store</span>
          </span>
          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </a>
      </div>
    </div>
  );
}

/**
 * Desktop Sticky Left Sidebar
 */
export function DashboardSidebar(props: DashboardSidebarProps) {
  return (
    <aside className="hidden md:flex w-64 border-r border-border bg-card/60 backdrop-blur shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto flex-col z-30">
      <SidebarNavContent {...props} />
    </aside>
  );
}

/**
 * Mobile Drawer Menu
 */
export function MobileNavSheet(props: DashboardSidebarProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-foreground md:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle navigation menu</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-card">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <SidebarNavContent {...props} onItemClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
