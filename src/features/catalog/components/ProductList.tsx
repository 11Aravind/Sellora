"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Package,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  Sparkles,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { Pagination } from "@/components/shared/Pagination";
import { UpgradeDialog } from "@/features/subscriptions/components/UpgradeDialog";
import { ProductStockBadge } from "./ProductStockBadge";
import { BulkArchiveDialog } from "./BulkArchiveDialog";
import {
  archiveProductAction,
  unarchiveProductAction,
  deleteProductAction,
} from "../actions";
import type { PaginatedProducts } from "../types";
import type { TenantUsageInfo } from "@/features/tenants/types";

interface ProductListProps {
  tenantId: string;
  tenantSlug: string;
  paginatedData: PaginatedProducts;
  usageInfo: TenantUsageInfo;
}

export function ProductList({
  tenantId,
  tenantSlug,
  paginatedData,
  usageInfo,
}: ProductListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkArchiveOpen, setBulkArchiveOpen] = React.useState(false);
  const [upgradeErrorCode, setUpgradeErrorCode] = React.useState<string | null>(null);
  const [loadingActionId, setLoadingActionId] = React.useState<string | null>(null);

  const { products, page, totalPages } = paginatedData;
  const { limits, usage } = usageInfo;

  const isQuotaFull = limits.products !== null && usage.products >= limits.products;
  const quotaText =
    limits.products === null
      ? `${usage.products} used (Unlimited)`
      : `${usage.products} of ${limits.products} used`;

  const handleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddProductClick = (e: React.MouseEvent) => {
    if (isQuotaFull) {
      e.preventDefault();
      setUpgradeErrorCode("PLAN_LIMIT_PRODUCTS");
    }
  };

  const handleArchive = async (productId: string) => {
    try {
      setLoadingActionId(productId);
      const res = await archiveProductAction(tenantId, productId);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Product moved to archive.");
      router.refresh();
    } catch {
      toast.error("Failed to archive product.");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleUnarchive = async (productId: string) => {
    try {
      setLoadingActionId(productId);
      const res = await unarchiveProductAction(tenantId, productId);
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
      toast.success("Product restored to active catalog.");
      router.refresh();
    } catch {
      toast.error("Failed to unarchive product.");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${productName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setLoadingActionId(productId);
      const res = await deleteProductAction(tenantId, productId);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Product deleted successfully.");
      router.refresh();
    } catch {
      toast.error("Failed to delete product.");
    } finally {
      setLoadingActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Quota Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs px-2.5 py-1 ${
              isQuotaFull
                ? "border-destructive text-destructive font-bold bg-destructive/10"
                : "border-border/80 text-muted-foreground"
            }`}
          >
            Product Quota: {quotaText}
          </Badge>
          {isQuotaFull && (
            <span className="text-xs text-destructive font-semibold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Plan limit reached
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkArchiveOpen(true)}
              className="text-xs h-8 gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Archive Selected ({selectedIds.length})</span>
            </Button>
          )}

          <Link
            href={`/dashboard/${tenantSlug}/products/new`}
            onClick={handleAddProductClick}
          >
            <Button size="sm" className="text-xs font-semibold gap-1.5 h-8">
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <Card className="border-border/80">
          <CardContent className="py-12">
            <EmptyState
              icon={<Package className="h-8 w-8 text-muted-foreground" />}
              title="No products match your criteria"
              description="Start stocking your digital shelves by adding physical or digital products to your catalog."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    if (isQuotaFull) {
                      setUpgradeErrorCode("PLAN_LIMIT_PRODUCTS");
                    } else {
                      router.push(`/dashboard/${tenantSlug}/products/new`);
                    }
                  }}
                >
                  Add New Product
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/80 overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border/80 text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {selectedIds.length === products.length ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock Inventory</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const isActionLoading = loadingActionId === p.id;
                  const coverImage = p.product_images?.[0];

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isSelected ? "bg-muted/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(p.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-muted border border-border/60">
                            {coverImage ? (
                              <Image
                                src={coverImage.url}
                                alt={coverImage.alt || p.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/dashboard/${tenantSlug}/products/${p.id}`}
                              className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                            >
                              {p.name}
                            </Link>
                            <div className="text-[11px] font-mono text-muted-foreground">
                              {p.sku ? `SKU: ${p.sku}` : `/${p.slug}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.categories ? (
                          <Badge variant="outline" className="text-[11px] font-normal">
                            {p.categories.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground font-mono">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                        }).format(p.price)}
                      </td>
                      <td className="px-4 py-3">
                        <ProductStockBadge
                          stock={p.stock}
                          trackInventory={p.track_inventory}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            p.status === "active"
                              ? "default"
                              : p.status === "draft"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px] capitalize font-medium"
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/${tenantSlug}/products/${p.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Edit product"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </Link>

                          {p.status === "archived" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-primary hover:text-primary/80"
                              title="Unarchive product"
                              disabled={isActionLoading}
                              onClick={() => handleUnarchive(p.id)}
                            >
                              {isActionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ArchiveRestore className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700"
                              title="Archive product (soft delete)"
                              disabled={isActionLoading}
                              onClick={() => handleArchive(p.id)}
                            >
                              {isActionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Archive className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive/80"
                            title="Hard delete (only if no orders exist)"
                            disabled={isActionLoading}
                            onClick={() => handleDelete(p.id, p.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border/60">
            {products.map((p) => {
              const coverImage = p.product_images?.[0];
              const isSelected = selectedIds.includes(p.id);

              return (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(p.id)}
                        className="text-muted-foreground"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                      <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-muted border border-border/60">
                        {coverImage ? (
                          <Image
                            src={coverImage.url}
                            alt={coverImage.alt || p.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/${tenantSlug}/products/${p.id}`}
                          className="font-semibold text-sm line-clamp-1"
                        >
                          {p.name}
                        </Link>
                        <div className="text-xs font-semibold text-primary">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                          }).format(p.price)}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={
                        p.status === "active"
                          ? "default"
                          : p.status === "draft"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px] capitalize"
                    >
                      {p.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                    <ProductStockBadge
                      stock={p.stock}
                      trackInventory={p.track_inventory}
                    />
                    <div className="flex items-center gap-1">
                      <Link href={`/dashboard/${tenantSlug}/products/${p.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {p.status === "archived" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-primary"
                          onClick={() => handleUnarchive(p.id)}
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-amber-600"
                          onClick={() => handleArchive(p.id)}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => handleDelete(p.id, p.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border/60">
              <Pagination currentPage={page} totalPages={totalPages} />
            </div>
          )}
        </Card>
      )}

      {/* Bulk Archive Dialog */}
      <BulkArchiveDialog
        open={bulkArchiveOpen}
        onOpenChange={setBulkArchiveOpen}
        tenantId={tenantId}
        productIds={selectedIds}
        onComplete={() => setSelectedIds([])}
      />

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={!!upgradeErrorCode}
        onOpenChange={(open) => !open && setUpgradeErrorCode(null)}
        tenantSlug={tenantSlug}
        errorCode={upgradeErrorCode || "PLAN_LIMIT_PRODUCTS"}
      />
    </div>
  );
}
