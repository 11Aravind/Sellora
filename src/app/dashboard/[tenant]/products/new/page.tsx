import * as React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/queries";
import { getTenantBySlug } from "@/features/tenants/queries";
import { getCategories } from "@/features/catalog/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProductForm } from "@/features/catalog/components/ProductForm";

export const dynamic = "force-dynamic";

interface NewProductPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function NewProductPage({ params }: NewProductPageProps) {
  const user = await requireUser();
  const { tenant: slug } = await params;

  const result = await getTenantBySlug(slug, user.id);
  if (!result) {
    notFound();
  }

  const { tenant } = result;
  const categories = await getCategories(tenant.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Product"
        description="Create a product listing with photos, inventory quantities, and pricing."
      />

      <ProductForm
        tenantId={tenant.id}
        tenantSlug={slug}
        categories={categories}
      />
    </div>
  );
}
