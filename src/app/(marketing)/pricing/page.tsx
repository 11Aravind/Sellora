import * as React from "react";
import { getActivePlans } from "@/features/plans/queries";
import { getCurrentUser } from "@/features/auth/queries";
import { PricingTable } from "@/features/plans/components/PricingTable";
import { ShieldCheck, Zap, RefreshCw } from "lucide-react";

export const metadata = {
  title: "Pricing Plans | SaaS Commerce Kit",
  description: "Transparent, flexible pricing for ambitious e-commerce brands and vendors. Start your 14-day free trial.",
};

export default async function PricingPage() {
  const [plans, user] = await Promise.all([
    getActivePlans(),
    getCurrentUser(),
  ]);

  return (
    <div className="py-16 md:py-24 container mx-auto px-4 max-w-7xl space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Predictable Pricing, Built for Scale
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Launch your online storefront with zero transaction commissions. Start on a risk-free trial and upgrade as your catalog expands.
        </p>
      </div>

      {/* Pricing Cards & Switcher */}
      <PricingTable plans={plans} isLoggedIn={Boolean(user)} />

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-border/60 max-w-5xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <Zap className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">Instant Provisioning</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your store subdomain and database entitlements are activated in seconds upon plan selection.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">No Forced Upgrades</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Quotas are transparently enforced by database triggers so your bill never includes surprise overage charges.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
            <RefreshCw className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">Cancel Anytime</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pause or cancel at any time directly from your dashboard. Your storefront remains open until the end of your billing cycle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
