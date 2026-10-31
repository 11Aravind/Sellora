"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Plan } from "@/features/plans/queries";

interface PricingTableProps {
  plans: Plan[];
  isLoggedIn: boolean;
}

export function PricingTable({ plans, isLoggedIn }: PricingTableProps) {
  const [interval, setInterval] = React.useState<"month" | "year">("month");

  // Filter plans by selected interval
  const displayedPlans = plans.filter((p) => p.billing_interval === interval);

  // Helper to calculate savings percentage for yearly plans compared to matching monthly plan
  const getYearlySavings = (yearlyPlan: Plan): number | null => {
    if (yearlyPlan.billing_interval !== "year" || yearlyPlan.price_paise <= 0) {
      return null;
    }

    const baseName = yearlyPlan.name.split(" (")[0].trim().toLowerCase();
    const matchingMonthly = plans.find(
      (p) =>
        p.billing_interval === "month" &&
        p.name.split(" (")[0].trim().toLowerCase() === baseName
    );

    if (!matchingMonthly || matchingMonthly.price_paise <= 0) {
      return null;
    }

    const annualMonthlyCost = matchingMonthly.price_paise * 12;
    if (yearlyPlan.price_paise >= annualMonthlyCost) {
      return null;
    }

    const savings = Math.round(
      ((annualMonthlyCost - yearlyPlan.price_paise) / annualMonthlyCost) * 100
    );
    return savings > 0 ? savings : null;
  };

  const ctaPrefix = isLoggedIn ? "/onboarding" : "/signup";

  return (
    <div className="space-y-10">
      {/* Interval Switcher */}
      <div className="flex justify-center items-center">
        <div className="inline-flex items-center rounded-full p-1 bg-muted/80 border border-border/80 shadow-inner">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={`px-5 py-2 text-xs font-semibold rounded-full transition-all ${
              interval === "month"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={`flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full transition-all ${
              interval === "year"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Annual Billing</span>
            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-none px-1.5 py-0">
              Save up to 20%
            </Badge>
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
        {displayedPlans.map((plan) => {
          const savings = getYearlySavings(plan);
          const formattedPrice = new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(plan.price_paise / 100);

          const isPopular = plan.code.includes("pro") || plan.code.includes("plus") || plan.sort_order === 1;

          return (
            <Card
              key={plan.id}
              className={`flex flex-col justify-between relative transition-all duration-300 hover:shadow-xl ${
                isPopular
                  ? "border-2 border-primary shadow-md bg-gradient-to-b from-card via-card to-primary/[0.02]"
                  : "border-border/80 shadow-sm"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground font-semibold text-[11px] px-3 py-0.5 shadow-sm gap-1">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="space-y-2 pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold tracking-tight">
                    {plan.name}
                  </CardTitle>
                  {savings && (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                      Save {savings}%
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs min-h-[32px]">
                  {plan.description || "Everything you need to launch and scale your storefront."}
                </CardDescription>

                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">
                    {formattedPrice}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    /{plan.billing_interval}
                  </span>
                </div>

                {plan.trial_days > 0 && (
                  <div className="pt-1">
                    <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      {plan.trial_days}-Day Risk-Free Trial
                    </Badge>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4 flex-1">
                <div className="border-t border-border/60 pt-4 space-y-2.5 text-xs">
                  <div className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                    Included Quotas & Capabilities
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {plan.max_products === null
                        ? "Unlimited products catalog"
                        : `Up to ${plan.max_products} active products`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {plan.max_staff === null
                        ? "Unlimited staff accounts"
                        : `Up to ${plan.max_staff} team members`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {plan.max_orders_per_month === null
                        ? "Unlimited monthly orders"
                        : `Up to ${plan.max_orders_per_month} orders / month`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${
                        plan.custom_domain_allowed ? "text-emerald-500" : "text-muted-foreground/40"
                      }`}
                    />
                    <span className={plan.custom_domain_allowed ? "font-semibold text-foreground" : "text-muted-foreground"}>
                      {plan.custom_domain_allowed
                        ? "Custom Domain Support"
                        : "Subdomain only (yourstore.domain.com)"}
                    </span>
                  </div>

                  {plan.features?.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-border/50">
                <Link
                  href={`${ctaPrefix}?plan=${encodeURIComponent(plan.code)}`}
                  className="w-full"
                >
                  <Button
                    className={`w-full font-semibold gap-2 ${
                      isPopular ? "shadow-md" : ""
                    }`}
                    variant={isPopular ? "default" : "outline"}
                  >
                    <span>
                      {plan.trial_days > 0 ? "Start Free Trial" : "Get Started"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
