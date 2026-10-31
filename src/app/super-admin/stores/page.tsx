import * as React from "react";
import Form from "next/form";
import { Search } from "lucide-react";
import { getSuperAdminStores, getSuperAdminPlans } from "@/features/plans/queries";
import { AdminStoresTable } from "@/features/tenants/components/AdminStoresTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface SuperAdminStoresPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    plan?: string;
    page?: string;
  }>;
}

export default async function SuperAdminStoresPage({
  searchParams,
}: SuperAdminStoresPageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const status = params.status || "all";
  const planCode = params.plan || "all";
  const page = parseInt(params.page || "1", 10) || 1;

  const [storesData, plans] = await Promise.all([
    getSuperAdminStores({
      search,
      status,
      planCode,
      page,
      pageSize: 20,
    }),
    getSuperAdminPlans(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Management"
        description="Inspect all merchant storefronts, track usage limits, and enforce administrative controls."
      />

      {/* Filter and Search Bar */}
      <div className="rounded-lg border border-border/70 p-4 bg-card shadow-sm">
        <Form action="/super-admin/stores" className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search by store name, slug, or owner email..."
              defaultValue={search}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex gap-2">
            <select
              name="status"
              defaultValue={status}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>

            <select
              name="plan"
              defaultValue={planCode}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>

            <Button type="submit" size="sm" variant="secondary" className="text-xs">
              Filter
            </Button>
          </div>
        </Form>
      </div>

      {/* Stores Table */}
      <AdminStoresTable stores={storesData.stores} />

      {/* Server Pagination */}
      <Pagination
        currentPage={page}
        totalPages={storesData.totalPages}
      />
    </div>
  );
}
