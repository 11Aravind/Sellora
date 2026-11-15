"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, CreditCard } from "lucide-react";

interface SettingsNavTabsProps {
  tenantSlug: string;
}

export function SettingsNavTabs({ tenantSlug }: SettingsNavTabsProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/${tenantSlug}/settings`;
  const isPaymentsActive = pathname.startsWith(`${basePath}/payments`);
  const isGeneralActive = pathname === basePath;

  return (
    <div className="border-b border-border mb-6">
      <nav className="flex space-x-6" aria-label="Settings navigation">
        <Link
          href={basePath}
          className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
            isGeneralActive
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Store className="h-4 w-4" />
          <span>General & Theme</span>
        </Link>

        <Link
          href={`${basePath}/payments`}
          className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
            isPaymentsActive
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Payment Gateways</span>
        </Link>
      </nav>
    </div>
  );
}

