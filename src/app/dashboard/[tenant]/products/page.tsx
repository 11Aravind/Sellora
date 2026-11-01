import * as React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/queries";
import { getTenantBySlug, getTenantUsage } from "@/features/tenants/queries";
import { getProducts, getCategories } from "@/features/catalog/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { UsageMeter } from "@/components/shared/UsageMeter";
import { ProductFilterBar } from "@/features/catalog/components/ProductFilterBar";
import { ProductList } from "@/features/catalog/components/ProductList";

export const dynamic = "force-dynamic";

interface ProductsPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    search?: string;
    status?: string;
    categoryId?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({
  params,
  searchParams,
}: ProductsPageProps) {
  const user = await requireUser();
  const { tenant: slug } = await params;
  const sp = await searchParams;

  const result = await getTenantBySlug(slug, user.id);
  if (!result) {
    notFound();
  }

  const { tenant } = result;

  const [usageInfo, categories, paginatedData] = await Promise.all([
    getTenantUsage(tenant.id),
    getCategories(tenant.id),
    getProducts(tenant.id, {
      search: sp.search,
      status: sp.status,
      categoryId: sp.categoryId,
      sort: sp.sort,
      page: sp.page ? parseInt(sp.page, 10) : 1,
      pageSize: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products Catalog"
        description="Manage your inventory, configure pricing, and track live stock levels."
      />

      {/* Quota Meter */}
      <UsageMeter
        usageInfo={usageInfo}
        tenantSlug={slug}
        compact={true}
      />

      {/* Filter and Search Bar */}
      <ProductFilterBar categories={categories} />

      {/* Product List */}
      <ProductList
        tenantId={tenant.id}
        tenantSlug={slug}
        paginatedData={paginatedData}
        usageInfo={usageInfo}
      />
    </div>
  );
}
