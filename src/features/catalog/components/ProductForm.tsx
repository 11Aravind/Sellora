"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Sparkles, Check, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { UpgradeDialog } from "@/features/subscriptions/components/UpgradeDialog";
import {
  ProductImageUploader,
  type ManagedImageItem,
} from "./ProductImageUploader";
import {
  productFormSchema,
  type ProductFormInput,
} from "../schemas";
import {
  createProductAction,
  updateProductAction,
} from "../actions";
import type { Category, Product } from "../types";

interface ProductFormProps {
  tenantId: string;
  tenantSlug: string;
  categories: Category[];
  initialData?: Product | null;
}

type SchemaType = Parameters<typeof zodResolver>[0];

export function ProductForm({
  tenantId,
  tenantSlug,
  categories,
  initialData,
}: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [upgradeErrorCode, setUpgradeErrorCode] = React.useState<string | null>(null);

  const isEditing = !!initialData;

  // Initialize managed images from initial product images
  const [managedImages, setManagedImages] = React.useState<ManagedImageItem[]>(() => {
    if (!initialData?.product_images) return [];
    return initialData.product_images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt || "",
      position: img.position,
    }));
  });

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema as unknown as SchemaType),
    defaultValues: {
      name: initialData?.name || "",
      slug: initialData?.slug || "",
      description: initialData?.description || "",
      price: initialData?.price ?? 0,
      compareAtPrice: initialData?.compare_at_price || null,
      sku: initialData?.sku || "",
      stock: initialData?.stock ?? 0,
      trackInventory: initialData?.track_inventory ?? true,
      status: initialData?.status || "draft",
      categoryId: initialData?.category_id || null,
      images: [],
    },
  });

  const productName = useWatch({ control: form.control, name: "name" }) ?? "";
  const categoryIdValue = useWatch({ control: form.control, name: "categoryId" }) || "";
  const trackInventoryValue = useWatch({ control: form.control, name: "trackInventory" }) ?? true;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    form.setValue("name", val, { shouldValidate: true });
    // Auto-generate slug in create mode if slug is pristine
    if (!isEditing && !form.getFieldState("slug").isDirty) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      form.setValue("slug", generated, { shouldValidate: true });
    }
  };

  const uploadImagesToStorage = async (
    productId: string,
    items: ManagedImageItem[]
  ): Promise<Array<{ url: string; alt: string; position: number }>> => {
    const supabase = createClient();
    const finalImages: Array<{ url: string; alt: string; position: number }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.file) {
        const fileExt = item.file.name.split(".").pop() || "jpg";
        const uniqueId = crypto.randomUUID();
        const storagePath = `${tenantId}/${productId}/${uniqueId}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(storagePath, item.file, {
            contentType: item.file.type,
            upsert: true,
          });

        if (uploadError) {
          console.error("[Storage Upload Error]:", uploadError);
          toast.error(`Failed to upload "${item.file.name}"`);
          continue;
        }

        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(storagePath);

        finalImages.push({
          url: data.publicUrl,
          alt: item.alt,
          position: i,
        });
      } else {
        // Existing image
        finalImages.push({
          url: item.url,
          alt: item.alt,
          position: i,
        });
      }
    }

    return finalImages;
  };

  const onSubmit = async (values: ProductFormInput) => {
    try {
      setIsSubmitting(true);

      if (isEditing) {
        // 1. Upload any newly added files
        const processedImages = await uploadImagesToStorage(
          initialData.id,
          managedImages
        );

        // 2. Update product and synchronize images
        const res = await updateProductAction(tenantId, initialData.id, {
          ...values,
          images: processedImages,
        });

        if (!res.ok) {
          if (
            res.code === "PLAN_LIMIT_PRODUCTS" ||
            res.code === "SUBSCRIPTION_INACTIVE"
          ) {
            setUpgradeErrorCode(res.code);
            return;
          }
          toast.error(res.message);
          return;
        }

        toast.success("Product updated successfully.");
        router.push(`/dashboard/${tenantSlug}/products`);
        router.refresh();
      } else {
        // 1. Create product row first to obtain product.id
        const createRes = await createProductAction(tenantId, {
          ...values,
          images: [],
        });

        if (!createRes.ok) {
          if (
            createRes.code === "PLAN_LIMIT_PRODUCTS" ||
            createRes.code === "SUBSCRIPTION_INACTIVE"
          ) {
            setUpgradeErrorCode(createRes.code);
            return;
          }
          toast.error(createRes.message);
          return;
        }

        const newProductId = createRes.data.id;

        // 2. Upload images to storage at {tenant_id}/{product_id}/{uuid}.{ext}
        if (managedImages.length > 0) {
          const uploadedImages = await uploadImagesToStorage(
            newProductId,
            managedImages
          );

          // 3. Link uploaded images to the new product row
          await updateProductAction(tenantId, newProductId, {
            ...values,
            images: uploadedImages,
          });
        }

        toast.success("Product created successfully.");
        router.push(`/dashboard/${tenantSlug}/products`);
        router.refresh();
      }
    } catch (err) {
      console.error("[ProductForm Submit Error]:", err);
      toast.error("An unexpected error occurred while saving the product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/${tenantSlug}/products`}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Products</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href={`/dashboard/${tenantSlug}/products`}>
              <Button type="button" variant="outline" size="sm" className="text-xs">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              size="sm"
              className="text-xs font-semibold gap-1.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>{isEditing ? "Save Changes" : "Create Product"}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column: Details, Description, Images */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span>General Information</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Basic identifying details shown across your storefront.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-name" className="text-xs font-semibold">
                    Product Title *
                  </Label>
                  <Input
                    id="prod-name"
                    placeholder="e.g. Classic Organic Cotton Tee"
                    className="text-xs"
                    value={productName}
                    onChange={handleNameChange}
                  />
                  {form.formState.errors.name && (
                    <p className="text-[11px] text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Slug */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prod-slug" className="text-xs font-semibold">
                      URL Slug *
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        const val = form.getValues("name") || "";
                        const generated = val
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, "");
                        form.setValue("slug", generated, { shouldValidate: true });
                      }}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Auto-generate</span>
                    </button>
                  </div>
                  <Input
                    id="prod-slug"
                    placeholder="classic-organic-cotton-tee"
                    className="text-xs font-mono"
                    {...form.register("slug")}
                  />
                  {form.formState.errors.slug && (
                    <p className="text-[11px] text-destructive">
                      {form.formState.errors.slug.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-desc" className="text-xs font-semibold">
                    Description (Markdown or Plain Text)
                  </Label>
                  <Textarea
                    id="prod-desc"
                    rows={6}
                    placeholder="Describe material, sizing, care instructions, and key features..."
                    className="text-xs resize-y"
                    {...form.register("description")}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Content is automatically sanitized and escaped during storefront rendering.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Product Media */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">Product Media</CardTitle>
                <CardDescription className="text-xs">
                  Upload up to 8 images. Reorder positions or update alt descriptions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductImageUploader
                  images={managedImages}
                  onChange={setManagedImages}
                  maxImages={8}
                />
              </CardContent>
            </Card>

            {/* Pricing Card */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">Pricing</CardTitle>
                <CardDescription className="text-xs">
                  Prices are stored in Indian Rupees (₹).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Selling Price */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-price" className="text-xs font-semibold">
                    Price (₹) *
                  </Label>
                  <Input
                    id="prod-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="999.00"
                    className="text-xs"
                    {...form.register("price", { valueAsNumber: true })}
                  />
                  {form.formState.errors.price && (
                    <p className="text-[11px] text-destructive">
                      {form.formState.errors.price.message}
                    </p>
                  )}
                </div>

                {/* Compare-at Price */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-compare" className="text-xs font-semibold">
                    Compare-at Price (₹) (Optional)
                  </Label>
                  <Input
                    id="prod-compare"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="1499.00"
                    className="text-xs"
                    {...form.register("compareAtPrice", {
                      setValueAs: (v) => (v === "" || isNaN(v) ? null : Number(v)),
                    })}
                  />
                  {form.formState.errors.compareAtPrice && (
                    <p className="text-[11px] text-destructive">
                      {form.formState.errors.compareAtPrice.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar: Status, Category, Inventory */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">Visibility Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prod-status" className="text-xs font-semibold">
                    Product Status
                  </Label>
                  <select
                    id="prod-status"
                    className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    {...form.register("status")}
                  >
                    <option value="draft">Draft (Hidden from storefront)</option>
                    <option value="active">Active (Live in storefront)</option>
                    <option value="archived">Archived (Soft deleted)</option>
                  </select>
                </div>

                {/* Category Card */}
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <Label htmlFor="prod-cat" className="text-xs font-semibold">
                    Assigned Category
                  </Label>
                  <select
                    id="prod-cat"
                    className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={categoryIdValue}
                    onChange={(e) => form.setValue("categoryId", e.target.value || null)}
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Card */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">Inventory & SKU</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* SKU */}
                <div className="space-y-1.5">
                  <Label htmlFor="prod-sku" className="text-xs font-semibold">
                    Stock Keeping Unit (SKU)
                  </Label>
                  <Input
                    id="prod-sku"
                    placeholder="TEE-ORG-BLK-M"
                    className="text-xs font-mono"
                    {...form.register("sku")}
                  />
                </div>

                {/* Track Inventory Switch */}
                <div className="flex items-center justify-between py-2 border-y border-border/50">
                  <div>
                    <div className="text-xs font-semibold text-foreground">Track Inventory</div>
                    <div className="text-[11px] text-muted-foreground">Enforce quantity limits</div>
                  </div>
                  <Switch
                    checked={trackInventoryValue}
                    onCheckedChange={(checked) => form.setValue("trackInventory", checked)}
                  />
                </div>

                {/* Stock Quantity */}
                {trackInventoryValue && (
                  <div className="space-y-1.5">
                    <Label htmlFor="prod-stock" className="text-xs font-semibold">
                      Stock Quantity
                    </Label>
                    <Input
                      id="prod-stock"
                      type="number"
                      min="0"
                      placeholder="50"
                      className="text-xs font-mono"
                      {...form.register("stock", { valueAsNumber: true })}
                    />
                    {form.formState.errors.stock && (
                      <p className="text-[11px] text-destructive">
                        {form.formState.errors.stock.message}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Upgrade Dialog for PLAN_LIMIT_PRODUCTS or SUBSCRIPTION_INACTIVE */}
      <UpgradeDialog
        open={!!upgradeErrorCode}
        onOpenChange={(open) => !open && setUpgradeErrorCode(null)}
        tenantSlug={tenantSlug}
        errorCode={upgradeErrorCode || "PLAN_LIMIT_PRODUCTS"}
      />
    </>
  );
}
