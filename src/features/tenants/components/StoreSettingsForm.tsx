"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Store,
  Upload,
  Globe,
  Palette,
  AlertTriangle,
  Loader2,
  Check,
  Sparkles,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { UpgradeDialog } from "@/features/subscriptions/components/UpgradeDialog";
import {
  storeSettingsSchema,
  type StoreSettingsInput,
} from "../schemas";
import {
  updateStoreSettingsAction,
  updateCustomDomainAction,
} from "../actions";
import type { TenantData } from "../types";

interface StoreSettingsFormProps {
  tenant: TenantData;
  customDomainAllowed: boolean;
  rootDomain: string;
}

type SchemaType = Parameters<typeof zodResolver>[0];

export function StoreSettingsForm({
  tenant,
  customDomainAllowed,
  rootDomain,
}: StoreSettingsFormProps) {
  const router = useRouter();
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);
  const [isSavingDomain, setIsSavingDomain] = React.useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState<string | null>(tenant.logo_url);
  const [customDomainValue, setCustomDomainValue] = React.useState(tenant.custom_domain || "");
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const form = useForm<StoreSettingsInput>({
    resolver: zodResolver(storeSettingsSchema as unknown as SchemaType),
    defaultValues: {
      name: tenant.name,
      logoUrl: tenant.logo_url || "",
      primaryColor: tenant.settings.primaryColor || "#0f172a",
      tagline: tenant.settings.tagline || "",
      bannerUrl: tenant.settings.bannerUrl || "",
      contactEmail: tenant.settings.contactEmail || "",
      contactPhone: tenant.settings.contactPhone || "",
      address: tenant.settings.address || "",
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be less than 5 MB.");
      return;
    }

    try {
      setIsUploadingLogo(true);
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const storagePath = `${tenant.id}/branding/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        toast.error("Failed to upload logo.");
        return;
      }

      const { data } = supabase.storage.from("product-images").getPublicUrl(storagePath);
      setLogoUrl(data.publicUrl);
      form.setValue("logoUrl", data.publicUrl);
      toast.success("Logo uploaded. Click 'Save Changes' to update your store.");
    } catch {
      toast.error("An error occurred during logo upload.");
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSettingsSubmit = async (values: StoreSettingsInput) => {
    try {
      setIsSavingSettings(true);
      const res = await updateStoreSettingsAction(tenant.id, {
        ...values,
        logoUrl: logoUrl || null,
      });

      if (!res.ok) {
        toast.error(res.message);
        return;
      }

      toast.success("Store settings updated successfully.");
      router.refresh();
    } catch {
      toast.error("Failed to update store settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customDomainAllowed) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      setIsSavingDomain(true);
      const res = await updateCustomDomainAction(tenant.id, {
        customDomain: customDomainValue.trim() || null,
      });

      if (!res.ok) {
        if (res.code === "PLAN_LIMIT_DOMAIN") {
          setShowUpgradeModal(true);
          return;
        }
        toast.error(res.message);
        return;
      }

      toast.success("Custom domain configuration updated.");
      router.refresh();
    } catch {
      toast.error("Failed to update custom domain.");
    } finally {
      setIsSavingDomain(false);
    }
  };

  return (
    <>
      <div className="space-y-8 max-w-4xl">
        {/* Security / Public Data Warning Callout */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-400 text-xs leading-relaxed">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <strong className="font-semibold">Public Storefront Configuration:</strong> All store details, branding assets, and contact information configured here are rendered publicly to customers on your storefront. Do not put private API secrets, tokens, or credentials here.
          </div>
        </div>

        {/* General Store Settings */}
        <form onSubmit={form.handleSubmit(onSettingsSubmit)} className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                <span>Store Identity & Branding</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Configure your store name, logo, and public brand appearance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Store Name */}
              <div className="space-y-1.5">
                <Label htmlFor="store-name" className="text-xs font-semibold">
                  Store Display Name *
                </Label>
                <Input
                  id="store-name"
                  placeholder="e.g. Acme Outfitters"
                  className="text-xs max-w-md"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-[11px] text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Store Brand Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-xl border border-border/80 bg-muted/30 overflow-hidden flex items-center justify-center">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt="Store logo"
                        fill
                        sizes="64px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <Store className="h-8 w-8 text-muted-foreground/60" />
                    )}
                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />

                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{logoUrl ? "Change Logo" : "Upload Logo"}</span>
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Recommended: Square PNG or WEBP with transparent background (max 5 MB).
                    </p>
                  </div>
                </div>
              </div>

              {/* Tagline */}
              <div className="space-y-1.5">
                <Label htmlFor="store-tagline" className="text-xs font-semibold">
                  Store Tagline
                </Label>
                <Input
                  id="store-tagline"
                  placeholder="e.g. Premium sustainable apparel crafted for adventure"
                  className="text-xs max-w-lg"
                  {...form.register("tagline")}
                />
              </div>

              {/* Theme Primary Color */}
              <div className="space-y-1.5">
                <Label htmlFor="store-color" className="text-xs font-semibold flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-primary" />
                  <span>Theme Accent Color</span>
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-9 w-9 rounded-md border border-input cursor-pointer bg-transparent"
                    value={form.watch("primaryColor")}
                    onChange={(e) => form.setValue("primaryColor", e.target.value)}
                  />
                  <Input
                    id="store-color"
                    placeholder="#0f172a"
                    className="text-xs font-mono max-w-[140px]"
                    {...form.register("primaryColor")}
                  />
                </div>
                {form.formState.errors.primaryColor && (
                  <p className="text-[11px] text-destructive">
                    {form.formState.errors.primaryColor.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Store Contact & Physical Details */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">Contact & Location</CardTitle>
              <CardDescription className="text-xs">
                Customer support contacts displayed in your storefront footer and order receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact-email" className="text-xs font-semibold">
                  Support Email
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="support@yourbrand.com"
                  className="text-xs"
                  {...form.register("contactEmail")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-phone" className="text-xs font-semibold">
                  Support Phone
                </Label>
                <Input
                  id="contact-phone"
                  placeholder="+91 98765 43210"
                  className="text-xs"
                  {...form.register("contactPhone")}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="store-address" className="text-xs font-semibold">
                  Physical Store or Warehouse Address
                </Label>
                <Textarea
                  id="store-address"
                  rows={2}
                  placeholder="Street, City, State, PIN Code"
                  className="text-xs"
                  {...form.register("address")}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              className="text-xs font-semibold gap-1.5"
              disabled={isSavingSettings}
            >
              {isSavingSettings ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>Save Changes</span>
            </Button>
          </div>
        </form>

        {/* Custom Domain Settings Card */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-bold">Custom Domain</CardTitle>
              </div>
              <Badge
                variant={customDomainAllowed ? "default" : "outline"}
                className="text-[10px] font-semibold"
              >
                {customDomainAllowed ? "Available on Plan" : "Upgrade Required"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Link your own branded domain to your storefront.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleDomainSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="custom-domain" className="text-xs font-semibold">
                  Domain Name
                </Label>
                <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
                  <Input
                    id="custom-domain"
                    placeholder="shop.yourbrand.com"
                    className="text-xs font-mono"
                    value={customDomainValue}
                    onChange={(e) => setCustomDomainValue(e.target.value)}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="text-xs font-semibold gap-1.5 shrink-0"
                    disabled={isSavingDomain}
                  >
                    {isSavingDomain ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : !customDomainAllowed ? (
                      <Lock className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    <span>{customDomainAllowed ? "Save Domain" : "Unlock Feature"}</span>
                  </Button>
                </div>
              </div>
            </form>

            {/* DNS Instructions Callout */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-xs space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>DNS Configuration Instructions</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                To connect your custom domain, create a <strong>CNAME</strong> record at your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) pointing your custom subdomain to:
              </p>
              <div className="p-2.5 rounded-lg bg-background font-mono text-[11px] border border-border/60 text-foreground flex items-center justify-between">
                <span>{tenant.slug}.{rootDomain}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Target CNAME</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                DNS propagation usually takes 5 to 60 minutes. Once propagated, requests to your custom domain will automatically route to your store.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <UpgradeDialog
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        tenantSlug={tenant.slug}
        errorCode="PLAN_LIMIT_DOMAIN"
      />
    </>
  );
}
