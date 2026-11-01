import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Search,
  Download,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
} from "lucide-react";
import { requireUser } from "@/features/auth/queries";
import { getTenantBySlug } from "@/features/tenants/queries";
import { getTenantOrders } from "@/features/orders/queries";
import { OrderStatusBadge, PaymentStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface OrdersPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    status?: string;
    payment?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function TenantOrdersPage({
  params,
  searchParams,
}: OrdersPageProps) {
  const user = await requireUser();
  const { tenant: slug } = await params;
  const {
    status = "all",
    payment = "all",
    q = "",
    from = "",
    to = "",
    page = "1",
  } = await searchParams;

  const result = await getTenantBySlug(slug, user.id);
  if (!result) {
    notFound();
  }

  const { tenant } = result;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = 20;

  const { orders, total, totalPages } = await getTenantOrders(tenant.id, {
    status,
    paymentStatus: payment,
    search: q,
    from: from || undefined,
    to: to || undefined,
    page: currentPage,
    pageSize,
  });

  const createQueryString = (newParams: Record<string, string | null>) => {
    const current = new URLSearchParams();
    if (status && status !== "all") current.set("status", status);
    if (payment && payment !== "all") current.set("payment", payment);
    if (q) current.set("q", q);
    if (from) current.set("from", from);
    if (to) current.set("to", to);
    if (currentPage > 1) current.set("page", String(currentPage));

    for (const [key, val] of Object.entries(newParams)) {
      if (val === null || val === "" || val === "all") {
        current.delete(key);
      } else {
        current.set(key, val);
      }
    }
    const str = current.toString();
    return str ? `?${str}` : "";
  };

  const statusTabs = [
    { label: "All Orders", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Shipped", value: "shipped" },
    { label: "Delivered", value: "delivered" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Process and manage customer orders, fulfillment, and returns."
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/${slug}/orders/export${createQueryString({})}`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 text-xs" })}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Link>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border/60">
        {statusTabs.map((tab) => {
          const isActive = status === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/dashboard/${slug}/orders${createQueryString({ status: tab.value, page: "1" })}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form method="GET" className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search order #, customer, phone..."
            className="pl-9 h-9 text-xs"
          />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          {payment !== "all" && <input type="hidden" name="payment" value={payment} />}
        </form>

        <div className="flex items-center gap-2">
          {/* Payment Status Dropdown Selector */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/50 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-0.5" />
            <Link
              href={`/dashboard/${slug}/orders${createQueryString({ payment: null, page: "1" })}`}
              className={`px-2 py-0.5 rounded text-[11px] ${
                payment === "all" ? "bg-background font-semibold shadow-xs" : "text-muted-foreground"
              }`}
            >
              All Pay
            </Link>
            <Link
              href={`/dashboard/${slug}/orders${createQueryString({ payment: "pending", page: "1" })}`}
              className={`px-2 py-0.5 rounded text-[11px] ${
                payment === "pending" ? "bg-background font-semibold shadow-xs" : "text-muted-foreground"
              }`}
            >
              COD Pending
            </Link>
            <Link
              href={`/dashboard/${slug}/orders${createQueryString({ payment: "paid", page: "1" })}`}
              className={`px-2 py-0.5 rounded text-[11px] ${
                payment === "paid" ? "bg-background font-semibold shadow-xs" : "text-muted-foreground"
              }`}
            >
              Paid
            </Link>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-3">
          <Package className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-semibold text-foreground text-sm">No orders found</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {q || status !== "all" || payment !== "all"
              ? "No orders match the selected search or filter criteria."
              : "When customers place orders from your store, they will appear here."}
          </p>
          {(q || status !== "all" || payment !== "all") && (
            <Link
              href={`/dashboard/${slug}/orders`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "text-xs" })}
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((order) => {
                  const dateStr = new Date(order.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        <Link
                          href={`/dashboard/${slug}/orders/${order.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">{dateStr}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-foreground">{order.customer_name}</p>
                        {order.customer_phone && (
                          <p className="text-[11px] text-muted-foreground">{order.customer_phone}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {order.items_count} {order.items_count === 1 ? "item" : "items"}
                      </td>
                      <td className="py-3.5 px-4">
                        <PaymentStatusBadge status={order.payment_status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">
                        ₹{order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/dashboard/${slug}/orders/${order.id}`}
                          className={buttonVariants({ variant: "ghost", size: "sm", className: "h-7 gap-1 text-xs" })}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, total)} of {total} orders
          </p>

          <div className="flex items-center gap-1.5">
            {currentPage <= 1 ? (
              <span
                className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 opacity-40 pointer-events-none" })}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </span>
            ) : (
              <Link
                href={`/dashboard/${slug}/orders${createQueryString({ page: String(currentPage - 1) })}`}
                className={buttonVariants({ variant: "outline", size: "sm", className: "h-8" })}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            )}

            <span className="text-xs px-2 text-muted-foreground font-medium">
              Page {currentPage} of {totalPages}
            </span>

            {currentPage >= totalPages ? (
              <span
                className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 opacity-40 pointer-events-none" })}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            ) : (
              <Link
                href={`/dashboard/${slug}/orders${createQueryString({ page: String(currentPage + 1) })}`}
                className={buttonVariants({ variant: "outline", size: "sm", className: "h-8" })}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
