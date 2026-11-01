import * as React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/queries";
import { getTenantBySlug } from "@/features/tenants/queries";
import { getProduct, getCategories } from "@/features/catalog/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProductForm } from "@/features/catalog/components/ProductForm";

export const dynamic = "force-dynamic";

interface EditProductPageProps {
  params: Promise<{ tenant: string; id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const user = await requireUser();
  const { tenant: slug, id: productId } = await params;

  const result = await getTenantBySlug(slug, user.id);
  if (!result) {
    notFound();
  }

  const { tenant } = result;

  const [product, categories] = await Promise.all([
    getProduct(tenant.id, productId),
    getCategories(tenant.id),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit "${product.name}"`}
        description="Update pricing, manage photos, adjust stock, or change category."
      />

      <ProductForm
        tenantId={tenant.id}
        tenantSlug={slug}
        categories={categories}
        initialData={product}
      />
    </div>
  );
}
