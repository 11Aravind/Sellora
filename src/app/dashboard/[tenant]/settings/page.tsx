import * as React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/queries";
import { getTenantBySlug, getTenantUsage } from "@/features/tenants/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { StoreSettingsForm } from "@/features/tenants/components/StoreSettingsForm";

export const dynamic = "force-dynamic";

interface SettingsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const user = await requireUser();
  const { tenant: slug } = await params;

  const result = await getTenantBySlug(slug, user.id);
  if (!result) {
    notFound();
  }

  const { tenant, role } = result;

  // Staff members are forbidden from accessing store settings
  if (role === "staff") {
    notFound();
  }

  const usageInfo = await getTenantUsage(tenant.id);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Settings & Theme"
        description="Configure your brand visual assets, theme styling, support contacts, and custom domain."
      />

      <StoreSettingsForm
        tenant={tenant}
        customDomainAllowed={usageInfo.limits.custom_domain}
        rootDomain={rootDomain}
      />
    </div>
  );
}
