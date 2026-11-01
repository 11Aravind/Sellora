import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Printer,
  ChevronLeft,
  Package,
  MapPin,
  User,
  Clock,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import { requireUser } from "@/features/auth/queries";
import { getTenantBySlug } from "@/features/tenants/queries";
import { getTenantOrderById } from "@/features/orders/queries";
import { OrderStatusBadge, PaymentStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { OrderActionButtons } from "@/features/orders/components/OrderActionButtons";
import { OrderTimeline } from "@/features/orders/components/OrderTimeline";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface OrderDetailPageProps {
  params: Promise<{ tenant: string; id: string }>;
}

export default async function TenantOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const user = await requireUser();
  const { tenant: slug, id: orderId } = await params;

  const result = await getTenantBySlug(slug, user.id);
  if (!result) {
    notFound();
  }

  const { tenant } = result;
  const order = await getTenantOrderById(tenant.id, orderId);

  if (!order) {
    notFound();
  }

  const dateStr = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const shipping = order.shipping_address;

  return (
    <div className="space-y-6 pb-16">
      {/* Back button */}
      <div>
        <Link
          href={`/dashboard/${slug}/orders`}
          className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1 text-xs text-muted-foreground" })}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Back to Orders</span>
        </Link>
      </div>

      {/* Header */}
      <PageHeader
        title={order.order_number}
        description={`Placed on ${dateStr}`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/${slug}/orders/${order.id}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 text-xs" })}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Packing Slip</span>
            </Link>
          </div>
        }
      />

      {/* Action Bar (Status Transitions & Payments) */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment_status} />
        </div>

        <OrderActionButtons
          tenantId={tenant.id}
          tenantSlug={slug}
          orderId={order.id}
          currentStatus={order.status}
          currentPaymentStatus={order.payment_status}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Items & Totals */}
        <div className="lg:col-span-8 space-y-6">
          {/* Items Card */}
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Package className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">
                Ordered Items ({order.items.length})
              </h2>
            </div>

            <div className="divide-y divide-border/60">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted/40">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {item.name}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {item.sku ? `SKU: ${item.sku} • ` : ""}Qty: {item.quantity} × ₹
                        {item.unit_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-bold text-foreground">
                    ₹{item.line_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 border-t border-border/60 pt-4 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">
                  ₹{order.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Free (Cash on Delivery)
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border/50">
                <span>Total Amount</span>
                <span>
                  ₹{order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Delivery Notes */}
          {order.notes && (
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                <span>Customer & Delivery Instructions</span>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-line bg-muted/30 p-3 rounded-lg border border-border/50">
                {order.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Customer Details & Timeline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Customer Details Card */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <User className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                Customer Details
              </h3>
            </div>
            <div className="space-y-2 text-xs">
              <p className="font-bold text-foreground text-sm">
                {order.customer?.name || shipping?.name || "Customer"}
              </p>
              {order.customer?.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{order.customer.email}</span>
                </div>
              )}
              {(order.customer?.phone || shipping?.phone) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{order.customer?.phone || shipping?.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address Card */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                Shipping Address
              </h3>
            </div>
            {shipping ? (
              <div className="space-y-1 text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground">{shipping.name}</p>
                <p>{shipping.phone}</p>
                <p>{shipping.address_line_1}</p>
                {shipping.address_line_2 && <p>{shipping.address_line_2}</p>}
                <p>
                  {shipping.city}, {shipping.state} - {shipping.pin_code}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No address recorded</p>
            )}
          </div>

          {/* Order Timeline Card */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                Status History
              </h3>
            </div>
            <OrderTimeline events={order.events} />
          </div>
        </div>
      </div>
    </div>
  );
}

