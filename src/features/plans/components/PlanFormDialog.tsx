"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { planFormSchema, type PlanFormInput } from "../schemas";
import { createPlanAction, updatePlanAction } from "../actions";
import type { PlanWithMeta } from "../types";

type SchemaType = Parameters<typeof zodResolver>[0];

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planToEdit?: PlanWithMeta | null;
}

export function PlanFormDialog({
  open,
  onOpenChange,
  planToEdit,
}: PlanFormDialogProps) {
  const [isPending, startTransition] = React.useTransition();
  const [newFeatureText, setNewFeatureText] = React.useState("");

  const isEditing = Boolean(planToEdit);
  const storesCount = planToEdit?.subscriptions_count || 0;

  const defaultValues: PlanFormInput = React.useMemo(() => {
    if (planToEdit) {
      return {
        code: planToEdit.code,
        name: planToEdit.name,
        description: planToEdit.description || "",
        billingInterval: planToEdit.billing_interval,
        priceRupees: planToEdit.price_paise / 100,
        trialDays: planToEdit.trial_days,
        maxProducts: planToEdit.max_products,
        maxStaff: planToEdit.max_staff,
        maxOrdersPerMonth: planToEdit.max_orders_per_month,
        customDomainAllowed: planToEdit.custom_domain_allowed,
        features: planToEdit.features || [],
        sortOrder: planToEdit.sort_order,
        isActive: planToEdit.is_active,
      };
    }
    return {
      code: "",
      name: "",
      description: "",
      billingInterval: "month",
      priceRupees: 499,
      trialDays: 14,
      maxProducts: 30,
      maxStaff: 2,
      maxOrdersPerMonth: 100,
      customDomainAllowed: false,
      features: ["Standard storefront", "Order management", "Mobile responsive"],
      sortOrder: 0,
      isActive: true,
    };
  }, [planToEdit]);

  const form = useForm<PlanFormInput>({
    resolver: zodResolver(planFormSchema as unknown as SchemaType),
    defaultValues,
  });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const watchedValues = form.watch();

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    const currentFeatures = form.getValues("features") || [];
    form.setValue("features", [...currentFeatures, newFeatureText.trim()]);
    setNewFeatureText("");
  };

  const handleRemoveFeature = (index: number) => {
    const currentFeatures = form.getValues("features") || [];
    form.setValue(
      "features",
      currentFeatures.filter((_, i) => i !== index)
    );
  };

  const onSubmit = (values: PlanFormInput) => {
    startTransition(async () => {
      const result = isEditing && planToEdit
        ? await updatePlanAction(planToEdit.id, values)
        : await createPlanAction(values);

      if (!result.ok) {
        toast.error(isEditing ? "Failed to update plan" : "Failed to create plan", {
          description: result.message,
        });
        return;
      }

      toast.success(isEditing ? "Plan updated successfully!" : "Plan created successfully!");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? `Edit Plan: ${planToEdit?.name}` : "Create Subscription Plan"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure pricing tiers, usage limits (products, staff, orders), and features.
          </DialogDescription>
        </DialogHeader>

        {/* Warning if editing a plan with active stores */}
        {isEditing && (
          <div className="space-y-2">
            {storesCount > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Notice:</span> This plan currently has{" "}
                  <span className="font-bold underline">{storesCount} store(s)</span> using it.
                  Changes to limits or features apply to existing stores immediately.
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 text-blue-700 dark:text-blue-400 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
              <div>
                <span className="font-semibold">Razorpay Immutability:</span> Modifying the price or billing interval will automatically provision a new Razorpay plan. Existing subscribers keep their grandfathered rate until they change plans.
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Form Columns */}
          <div className="lg:col-span-7">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Code & Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Plan Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="starter"
                            disabled={isEditing || isPending}
                            className="font-mono text-xs"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-[10px]">
                          {isEditing ? "Plan code is immutable." : "Unique identifier (e.g. starter, pro)."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Plan Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Starter Plan" disabled={isPending} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Best for new stores launching their online business."
                          rows={2}
                          disabled={isPending}
                          className="text-xs resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pricing & Billing */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="priceRupees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Price (₹ INR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="499"
                            disabled={isPending}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-[10px]">
                          Stored in paise
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billingInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Billing Interval</FormLabel>
                        <Select
                          disabled={isPending}
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Select interval" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="month">Monthly</SelectItem>
                            <SelectItem value="year">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trialDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Trial Days</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="14"
                            disabled={isPending}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Usage Limits */}
                <div className="space-y-3 rounded-lg border border-border/70 p-3.5 bg-muted/20">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Plan Limits (Enforced by Database Triggers)
                  </div>

                  {/* Max Products */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium">Max Products</div>
                      <div className="text-[11px] text-muted-foreground">
                        {form.watch("maxProducts") === null ? "Unlimited products" : `Capped at ${form.watch("maxProducts")}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {form.watch("maxProducts") !== null && (
                        <Input
                          type="number"
                          min="1"
                          className="w-24 h-8 text-xs"
                          value={form.watch("maxProducts") ?? 30}
                          onChange={(e) =>
                            form.setValue("maxProducts", parseInt(e.target.value) || 0)
                          }
                          disabled={isPending}
                        />
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Switch
                          checked={form.watch("maxProducts") === null}
                          onCheckedChange={(checked) =>
                            form.setValue("maxProducts", checked ? null : 30)
                          }
                          disabled={isPending}
                        />
                        <span>Unlimited</span>
                      </div>
                    </div>
                  </div>

                  {/* Max Staff */}
                  <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-2.5">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium">Max Staff Members</div>
                      <div className="text-[11px] text-muted-foreground">
                        {form.watch("maxStaff") === null ? "Unlimited staff" : `Capped at ${form.watch("maxStaff")}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {form.watch("maxStaff") !== null && (
                        <Input
                          type="number"
                          min="1"
                          className="w-24 h-8 text-xs"
                          value={form.watch("maxStaff") ?? 2}
                          onChange={(e) =>
                            form.setValue("maxStaff", parseInt(e.target.value) || 0)
                          }
                          disabled={isPending}
                        />
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Switch
                          checked={form.watch("maxStaff") === null}
                          onCheckedChange={(checked) =>
                            form.setValue("maxStaff", checked ? null : 2)
                          }
                          disabled={isPending}
                        />
                        <span>Unlimited</span>
                      </div>
                    </div>
                  </div>

                  {/* Max Orders Per Month */}
                  <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-2.5">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium">Orders / Month</div>
                      <div className="text-[11px] text-muted-foreground">
                        {form.watch("maxOrdersPerMonth") === null ? "Unlimited monthly orders" : `Capped at ${form.watch("maxOrdersPerMonth")}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {form.watch("maxOrdersPerMonth") !== null && (
                        <Input
                          type="number"
                          min="1"
                          className="w-24 h-8 text-xs"
                          value={form.watch("maxOrdersPerMonth") ?? 100}
                          onChange={(e) =>
                            form.setValue("maxOrdersPerMonth", parseInt(e.target.value) || 0)
                          }
                          disabled={isPending}
                        />
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Switch
                          checked={form.watch("maxOrdersPerMonth") === null}
                          onCheckedChange={(checked) =>
                            form.setValue("maxOrdersPerMonth", checked ? null : 100)
                          }
                          disabled={isPending}
                        />
                        <span>Unlimited</span>
                      </div>
                    </div>
                  </div>

                  {/* Custom Domain Switch */}
                  <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-2.5">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium">Custom Domain Allowed</div>
                      <div className="text-[11px] text-muted-foreground">
                        Enable merchants to connect custom domains
                      </div>
                    </div>
                    <Switch
                      checked={form.watch("customDomainAllowed")}
                      onCheckedChange={(checked) =>
                        form.setValue("customDomainAllowed", checked)
                      }
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2">
                  <FormLabel className="text-xs">Marketing Feature Bullets</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 24/7 Priority Support"
                      value={newFeatureText}
                      onChange={(e) => setNewFeatureText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                      className="text-xs"
                      disabled={isPending}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddFeature}
                      disabled={isPending || !newFeatureText.trim()}
                      className="gap-1 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                    {(form.watch("features") || []).map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5 text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" />
                          <span>{feature}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFeature(idx)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sort Order & Active */}
                <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Display Sort Order:</span>
                    <Input
                      type="number"
                      className="w-20 h-8 text-xs"
                      value={form.watch("sortOrder")}
                      onChange={(e) =>
                        form.setValue("sortOrder", parseInt(e.target.value) || 0)
                      }
                      disabled={isPending}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Active:</span>
                    <Switch
                      checked={form.watch("isActive")}
                      onCheckedChange={(checked) =>
                        form.setValue("isActive", checked)
                      }
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isPending}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending} size="sm">
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : isEditing ? (
                      "Save Changes"
                    ) : (
                      "Create Plan"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-5 flex flex-col justify-start">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
              <Eye className="h-3.5 w-3.5" />
              <span>Live Pricing Card Preview</span>
            </div>

            <Card className="border-2 border-primary/40 shadow-md bg-card overflow-hidden">
              <CardHeader className="space-y-1.5 pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg text-foreground">
                    {watchedValues.name || "Plan Name"}
                  </span>
                  {watchedValues.trialDays > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {watchedValues.trialDays}-Day Free Trial
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {watchedValues.description || "No description provided."}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(watchedValues.priceRupees || 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    /{watchedValues.billingInterval || "month"}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs">
                  <div className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                    Limits & Inclusions
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      {watchedValues.maxProducts === null
                        ? "Unlimited products"
                        : `Up to ${watchedValues.maxProducts} products`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      {watchedValues.maxStaff === null
                        ? "Unlimited staff members"
                        : `Up to ${watchedValues.maxStaff} staff members`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      {watchedValues.maxOrdersPerMonth === null
                        ? "Unlimited orders / month"
                        : `Up to ${watchedValues.maxOrdersPerMonth} orders / month`}
                    </span>
                  </div>
                  {watchedValues.customDomainAllowed && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        Custom Domain support
                      </span>
                    </div>
                  )}

                  {watchedValues.features?.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full mt-2" size="sm" disabled>
                  Select Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
