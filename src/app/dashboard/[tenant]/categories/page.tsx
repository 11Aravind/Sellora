import * as React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/queries";
import { getTenantBySlug } from "@/features/tenants/queries";
import { getCategories } from "@/features/catalog/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { CategoryList } from "@/features/catalog/components/CategoryList";

export const dynamic = "force-dynamic";

interface CategoriesPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function CategoriesPage({ params }: CategoriesPageProps) {
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
        title="Product Categories"
        description="Organize your store catalog with hierarchical product categories."
      />

      <CategoryList tenantId={tenant.id} categories={categories} />
    </div>
  );
}
