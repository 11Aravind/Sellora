import * as React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/queries";
import { getTenantBySlug } from "@/features/tenants/queries";
import { getTenantPaymentGateway } from "@/features/payments/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsNavTabs } from "@/features/tenants/components/SettingsNavTabs";
import { PaymentSettingsView } from "@/features/payments/components/PaymentSettingsView";

export const dynamic = "force-dynamic";

interface PaymentSettingsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function PaymentSettingsPage({ params }: PaymentSettingsPageProps) {
  const user = await requireUser();
  const { tenant: slug } = await params;

  const result = await getTenantBySlug(slug, user.id);
  if (!result) {
    notFound();
  }

  const { tenant, role } = result;

  // Staff members are forbidden from accessing payment configurations
  if (role === "staff") {
    notFound();
  }

  const paymentConfig = await getTenantPaymentGateway(tenant.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Settings"
        description="Connect your payment gateway, manage payout accounts, and configure supported checkout payment methods."
      />

      <SettingsNavTabs tenantSlug={slug} />

      <PaymentSettingsView
        tenantId={tenant.id}
        tenantSlug={slug}
        initialConfig={paymentConfig}
      />
    </div>
  );
}

