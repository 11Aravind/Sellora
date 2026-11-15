"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  LayoutTemplate,
  Loader2,
  Sparkles,
  Store,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Plan } from "@/features/plans/queries";
import {
  checkSlugAvailability,
  createTenantAction,
} from "@/features/auth/actions";
import { SLUG_REGEX } from "@/features/auth/schemas";
import { THEME_LIST } from "@/features/themes/templates";
import type { StoreThemeId } from "@/features/themes/types";
import {
  ModernMinimalMockup,
  VibrantRetailMockup,
  ClassicBoutiqueMockup,
} from "@/features/themes/components/TemplateMockups";

interface OnboardingWizardProps {
  plans: Plan[];
  initialPlanCode?: string;
  rootDomain: string;
}

export function OnboardingWizard({
  plans,
  initialPlanCode,
  rootDomain,
}: OnboardingWizardProps) {
  const router = useRouter();

  // Wizard Step: 1 = Plan, 2 = Store Details (Name & Link), 3 = Choose UI Template
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [billingInterval, setBillingInterval] = React.useState<"month" | "year">("month");
  const [selectedPlanCode, setSelectedPlanCode] = React.useState<string>(() => {
    if (initialPlanCode && plans.some((p) => p.code === initialPlanCode)) {
      return initialPlanCode;
    }
    const firstPlan = plans.find((p) => p.billing_interval === "month") || plans[0];
    return firstPlan ? firstPlan.code : "";
  });

  const [storeName, setStoreName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [selectedTheme, setSelectedTheme] = React.useState<StoreThemeId>("modern-minimal");

  // Slug availability state
  const [isCheckingSlug, setIsCheckingSlug] = React.useState(false);
  const [isSlugAvailable, setIsSlugAvailable] = React.useState<boolean | null>(null);
  const [slugError, setSlugError] = React.useState<string | null>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Helper to format rupees
  const formatRupees = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  // Auto-slug generator from store name
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  };

  // Handle store name change
  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStoreName(val);
    if (!slugTouched) {
      setSlug(slugify(val));
    }
  };

  // Debounced check for slug availability
  React.useEffect(() => {
    if (step < 2 || !slug) {
      return;
    }

    const trimmed = slug.trim().toLowerCase();

    const timer = setTimeout(async () => {
      if (trimmed.length < 3) {
        setIsSlugAvailable(false);
        setSlugError("Store link must be at least 3 characters.");
        setIsCheckingSlug(false);
        return;
      }

      if (!SLUG_REGEX.test(trimmed)) {
        setIsSlugAvailable(false);
        setSlugError("Use only lowercase letters, numbers, and hyphens (3-40 chars).");
        setIsCheckingSlug(false);
        return;
      }

      setIsCheckingSlug(true);
      setSlugError(null);

      try {
        const result = await checkSlugAvailability(trimmed);
        setIsSlugAvailable(result.available);
        if (!result.available) {
          setSlugError(result.message || "That store link is already taken.");
        }
      } catch {
        setIsSlugAvailable(true);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug, step]);

  // Submit final tenant creation
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;

    if (!selectedPlanCode) {
      toast.error("Please select a subscription plan.");
      setStep(1);
      return;
    }

    if (storeName.trim().length < 2) {
      toast.error("Store name must be at least 2 characters.");
      setStep(2);
      return;
    }

    const trimmedSlug = slug.trim().toLowerCase();
    if (!SLUG_REGEX.test(trimmedSlug)) {
      toast.error("Invalid store link format.");
      setStep(2);
      return;
    }

    if (isSlugAvailable === false) {
      toast.error(slugError || "That store link is unavailable.");
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createTenantAction({
        planCode: selectedPlanCode,
        name: storeName.trim(),
        slug: trimmedSlug,
        theme: selectedTheme,
      });

      if (!result.ok) {
        toast.error("Could not create store", {
          description: result.message,
        });
        setIsSubmitting(false);
        return;
      }

      toast.success("Store created successfully!", {
        description: "Setting up your store dashboard...",
      });
      router.push(result.data.redirectUrl);
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  const filteredPlans = plans.filter((p) => p.billing_interval === billingInterval);
  const selectedPlan = plans.find((p) => p.code === selectedPlanCode);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in-50 duration-300">
      {/* Wizard Progress Header */}
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
          Let&apos;s build your online store
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Complete these 3 simple steps to launch your storefront and vendor dashboard.
        </p>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {[
            { num: 1, label: "Choose Plan" },
            { num: 2, label: "Store Details" },
            { num: 3, label: "UI Template" },
          ].map((item, idx) => (
            <React.Fragment key={item.num}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  step === item.num
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : step > item.num
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px]">
                  {step > item.num ? <Check className="h-3 w-3" /> : item.num}
                </span>
                <span>{item.label}</span>
              </div>
              {idx < 2 && (
                <div
                  className={`h-0.5 w-6 transition-colors ${
                    step > item.num ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP 1: CHOOSE PLAN */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex justify-center">
            <Tabs
              value={billingInterval}
              onValueChange={(val) => {
                const nextInterval = val as "month" | "year";
                setBillingInterval(nextInterval);
                const matchingPlan = plans.find((p) => p.billing_interval === nextInterval);
                if (matchingPlan) setSelectedPlanCode(matchingPlan.code);
              }}
              className="w-[280px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="month">Monthly</TabsTrigger>
                <TabsTrigger value="year">
                  Yearly <span className="ml-1 text-[10px] text-emerald-500 font-semibold">(2 mos free)</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => {
              const isSelected = selectedPlanCode === plan.code;
              const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];

              return (
                <Card
                  key={plan.id}
                  onClick={() => setSelectedPlanCode(plan.code)}
                  className={`relative cursor-pointer transition-all border-2 flex flex-col justify-between hover:shadow-md ${
                    isSelected
                      ? "border-primary bg-primary/[0.02] shadow-sm ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                      {isSelected && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                    <CardDescription className="text-xs min-h-[32px]">
                      {plan.description || "Everything you need to sell online."}
                    </CardDescription>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight">
                        {formatRupees(plan.price_paise)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        /{plan.billing_interval}
                      </span>
                    </div>

                    {plan.trial_days > 0 && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-[11px] gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="h-3 w-3" />
                          {plan.trial_days}-day free trial
                        </Badge>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-2 border-t border-border/50 flex-1">
                    <ul className="space-y-2.5 text-xs text-muted-foreground mt-2">
                      {features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-4 border-t border-border/50">
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      className="w-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlanCode(plan.code);
                        setStep(2);
                      }}
                    >
                      {isSelected ? "Selected — Continue" : "Select Plan"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              size="lg"
              disabled={!selectedPlanCode}
              onClick={() => setStep(2)}
              className="gap-2"
            >
              Continue to Store Details
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: STORE DETAILS (NAME & SUBDOMAIN LINK) */}
      {step === 2 && (
        <Card className="max-w-xl mx-auto shadow-md border-border/80">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
              <Store className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl font-bold">Store Details</CardTitle>
            <CardDescription>
              Set your store&apos;s brand name and claim your personalized store URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Store Name Input */}
            <div className="space-y-2">
              <Label htmlFor="storeName" className="font-semibold text-sm">
                Store Name
              </Label>
              <Input
                id="storeName"
                placeholder="e.g. Acme Organic Coffee"
                value={storeName}
                onChange={handleStoreNameChange}
                autoFocus
                maxLength={100}
                className="text-base py-5"
              />
              <p className="text-xs text-muted-foreground">
                Your store brand as shown to shoppers on invoices and your header.
              </p>
            </div>

            {/* Store Subdomain Input */}
            <div className="space-y-2">
              <Label htmlFor="storeSlug" className="font-semibold text-sm">
                Store Subdomain Link
              </Label>
              <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-ring">
                <input
                  id="storeSlug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                  placeholder="acme-coffee"
                  maxLength={40}
                  className="flex-1 bg-transparent px-3 py-2.5 text-base outline-none font-mono"
                />
                <span className="bg-muted text-muted-foreground px-3 py-2.5 text-sm font-medium border-l border-input rounded-r-md">
                  .{rootDomain}
                </span>
              </div>

              {/* Status indicator */}
              <div className="min-h-[22px] flex items-center gap-2 text-xs">
                {isCheckingSlug && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking availability...
                  </span>
                )}
                {!isCheckingSlug && isSlugAvailable === true && (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Available: <strong>{slug}.{rootDomain}</strong>
                  </span>
                )}
                {!isCheckingSlug && isSlugAvailable === false && (
                  <span className="flex items-center gap-1.5 text-destructive font-medium">
                    <XCircle className="h-4 w-4" />
                    {slugError || "That store link is not available."}
                  </span>
                )}
              </div>
            </div>

            {/* Selected Plan Summary Banner */}
            <div className="rounded-lg border border-border/80 bg-muted/40 p-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-foreground">Selected Plan: </span>
                <span className="text-muted-foreground">
                  {selectedPlan?.name} (
                  {formatRupees(selectedPlan?.price_paise ?? 0)}/
                  {selectedPlan?.billing_interval})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-primary hover:underline font-semibold"
              >
                Change
              </button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/50 pt-6">
            <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              disabled={
                storeName.trim().length < 2 ||
                !slug ||
                isCheckingSlug ||
                isSlugAvailable !== true
              }
              onClick={() => setStep(3)}
              className="gap-2"
            >
              Continue to UI Template
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 3: CHOOSE WEBSITE UI TEMPLATE */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Choose your website UI template
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Select the initial aesthetic for your storefront. You can change templates and customize brand colors anytime in Store Settings.
            </p>
          </div>

          {/* Template Selection Grid Matching Image */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {THEME_LIST.map((theme) => {
              const isSelected = selectedTheme === theme.id;

              return (
                <div
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`group relative cursor-pointer rounded-2xl p-5 transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-2 border-emerald-600 bg-card shadow-md ring-1 ring-emerald-600/30"
                      : "border border-border/80 bg-card hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Title, Category Subtitle, Radio Circle */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <h3 className="font-extrabold text-lg sm:text-xl text-foreground tracking-tight">
                          {theme.name}
                        </h3>
                        <p className="text-xs font-medium text-muted-foreground">
                          {theme.categoryTag}
                        </p>
                      </div>

                      {/* Top-Right Circular Radio Indicator */}
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "border-2 border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Realistic Storefront Mockup Preview */}
                    <div className="pt-1">
                      {theme.id === "modern-minimal" && (
                        <ModernMinimalMockup storeName={storeName} />
                      )}
                      {theme.id === "vibrant-retail" && (
                        <VibrantRetailMockup storeName={storeName} />
                      )}
                      {theme.id === "classic-boutique" && (
                        <ClassicBoutiqueMockup storeName={storeName} />
                      )}
                    </div>

                    {/* Template Description */}
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      {theme.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Launch Summary Card */}
          <Card className="border-border/80 bg-muted/30 shadow-xs">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  <span>Ready to Launch:</span>
                  <Badge variant="secondary" className="text-[11px]">
                    {storeName || "My Store"}
                  </Badge>
                </div>
                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    URL: <strong className="text-foreground">{slug}.{rootDomain}</strong>
                  </span>
                  <span>
                    Plan: <strong className="text-foreground">{selectedPlan?.name}</strong>
                  </span>
                  <span>
                    Template: <strong className="text-foreground">{THEME_LIST.find(t => t.id === selectedTheme)?.name}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <Button
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => setStep(2)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  size="lg"
                  className="gap-2 font-semibold shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Store...
                    </>
                  ) : (
                    <>
                      Launch Store
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
