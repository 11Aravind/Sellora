import * as React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/queries";
import { getTenantBySlug, getTenantMembers, getTenantUsage } from "@/features/tenants/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { MemberList } from "@/features/tenants/components/MemberList";

export const dynamic = "force-dynamic";

interface TeamPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const user = await requireUser();
  const { tenant: slug } = await params;

  const result = await getTenantBySlug(slug, user.id);
  if (!result) {
    notFound();
  }

  const { tenant, role } = result;

  // Staff members are forbidden from accessing team administration
  if (role === "staff") {
    notFound();
  }

  const [members, usageInfo] = await Promise.all([
    getTenantMembers(tenant.id),
    getTenantUsage(tenant.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & Access Control"
        description="Invite staff members, assign administration roles, and collaborate on store management."
      />

      <MemberList
        tenantId={tenant.id}
        tenantSlug={slug}
        members={members}
        currentUserId={user.id}
        isOwner={role === "owner"}
        staffQuotaUsed={usageInfo.usage.staff}
        staffQuotaMax={usageInfo.limits.staff}
      />
    </div>
  );
}
