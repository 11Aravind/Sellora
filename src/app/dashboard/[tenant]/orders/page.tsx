import * as React from "react";
import { notFound } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { requireUser } from "@/features/auth/queries";
import { getTenantBySlug } from "@/features/tenants/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface OrdersPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const user = await requireUser();
  const { tenant: slug } = await params;

  const result = await getTenantBySlug(slug, user.id);
  if (!result) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Orders"
        description="View incoming orders, manage fulfillment statuses, and process refunds."
      />

      <Card className="border-border/80">
        <CardContent className="py-16">
          <EmptyState
            icon={<ShoppingCart className="h-8 w-8 text-muted-foreground" />}
            title="No orders placed yet"
            description="When customers complete checkout on your storefront, orders will appear here in real time."
          />
        </CardContent>
      </Card>
    </div>
  );
}
