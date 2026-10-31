"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Globe,
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

  // Wizard Step: 1 = Plan, 2 = Store Name, 3 = Store Slug
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
    if (step !== 3 || !slug) {
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
      setStep(3);
      return;
    }

    if (isSlugAvailable === false) {
      toast.error(slugError || "That store link is unavailable.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createTenantAction({
        planCode: selectedPlanCode,
        name: storeName.trim(),
        slug: trimmedSlug,
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-300">
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
            { num: 2, label: "Name Store" },
            { num: 3, label: "Claim Link" },
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
              Continue to Store Name
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: STORE NAME */}
      {step === 2 && (
        <Card className="max-w-xl mx-auto shadow-md border-border/80">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
              <Store className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl font-bold">What is your store named?</CardTitle>
            <CardDescription>
              This is the brand name your customers will see on receipts, emails, and your storefront header.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                placeholder="e.g. Acme Organic Coffee"
                value={storeName}
                onChange={handleStoreNameChange}
                autoFocus
                maxLength={100}
                className="text-lg py-6"
              />
              <p className="text-xs text-muted-foreground">
                You can change your store display name at any time from your settings.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/50 pt-6">
            <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              disabled={storeName.trim().length < 2}
              onClick={() => {
                if (!slugTouched) {
                  setSlug(slugify(storeName));
                }
                setStep(3);
              }}
              className="gap-2"
            >
              Continue to Store Link
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 3: STORE LINK / SLUG */}
      {step === 3 && (
        <Card className="max-w-xl mx-auto shadow-md border-border/80">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
              <Globe className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl font-bold">Claim your store link</CardTitle>
            <CardDescription>
              Your store will be instantly accessible at this unique subdomain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeSlug">Store Subdomain</Label>
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
                  className="flex-1 bg-transparent px-3 py-3 text-base outline-none font-mono"
                  autoFocus
                />
                <span className="bg-muted text-muted-foreground px-3 py-3 text-sm font-medium border-l border-input rounded-r-md">
                  .{rootDomain}
                </span>
              </div>

              {/* Status indicator */}
              <div className="min-h-[24px] flex items-center gap-2 text-xs">
                {isCheckingSlug && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking availability...
                  </span>
                )}
                {!isCheckingSlug && isSlugAvailable === true && (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Great! <strong>{slug}.{rootDomain}</strong> is available.
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
            <div className="rounded-lg border border-border/80 bg-muted/40 p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-foreground">Selected Plan: </span>
                <span className="text-muted-foreground">
                  {plans.find((p) => p.code === selectedPlanCode)?.name} (
                  {formatRupees(plans.find((p) => p.code === selectedPlanCode)?.price_paise ?? 0)}/
                  {plans.find((p) => p.code === selectedPlanCode)?.billing_interval})
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
              disabled={
                isSubmitting ||
                isCheckingSlug ||
                isSlugAvailable !== true ||
                !slug
              }
              onClick={handleFinalSubmit}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Store...
                </>
              ) : (
                <>
                  Launch Store
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
