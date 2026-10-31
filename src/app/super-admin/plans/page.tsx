import * as React from "react";
import { getSuperAdminPlans } from "@/features/plans/queries";
import { PlansTable } from "@/features/plans/components/PlansTable";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

export default async function SuperAdminPlansPage() {
  const plans = await getSuperAdminPlans();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Plans"
        description="Manage subscription tiers, pricing, trial periods, and trigger-enforced catalog limits."
      />

      <PlansTable plans={plans} />
    </div>
  );
}
