import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/queries";
import { getTenantBySlug } from "@/features/tenants/queries";
import { getTenantOrderById } from "@/features/orders/queries";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

interface PrintPageProps {
  params: Promise<{ tenant: string; id: string }>;
}

export default async function OrderPrintPage({ params }: PrintPageProps) {
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
  });

  const shipping = order.shipping_address;

  return (
    <div className="min-h-screen bg-white text-black p-8 sm:p-12 print:p-0 print:m-0 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body {
                background: white !important;
                color: black !important;
              }
              .no-print {
                display: none !important;
              }
              @page {
                margin: 1.5cm;
              }
            }
          `,
        }}
      />

      {/* Top Action Bar (hidden in print) */}
      <div className="no-print max-w-3xl mx-auto mb-8 flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="font-bold text-lg">Packing Slip Preview</h2>
          <p className="text-xs text-gray-500">
            Preview the printable invoice and packing slip for {order.order_number}.
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Packing Slip Body */}
      <div className="max-w-3xl mx-auto border border-gray-200 print:border-none p-8 rounded-lg shadow-sm print:shadow-none print:p-0 space-y-8">
        {/* Header: Store details & Order Details */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {tenant.name}
            </h1>
            {tenant.settings?.tagline && (
              <p className="text-xs text-gray-500">{String(tenant.settings.tagline)}</p>
            )}
            <p className="text-xs text-gray-500 pt-1">PACKING SLIP & INVOICE</p>
          </div>

          <div className="text-right space-y-1">
            <p className="text-xl font-mono font-bold text-gray-900">
              {order.order_number}
            </p>
            <p className="text-xs text-gray-600">Date: {dateStr}</p>
            <p className="text-xs text-gray-600 font-medium">
              Payment: Cash on Delivery ({order.payment_status.toUpperCase()})
            </p>
          </div>
        </div>

        {/* Shipping Address & Customer Info */}
        <div className="grid grid-cols-2 gap-8 text-xs border-b border-gray-200 pb-6">
          <div className="space-y-1">
            <p className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">
              Ship To:
            </p>
            {shipping ? (
              <div className="space-y-0.5 text-gray-800">
                <p className="font-semibold text-sm text-gray-900">{shipping.name}</p>
                <p>{shipping.phone}</p>
                <p>{shipping.address_line_1}</p>
                {shipping.address_line_2 && <p>{shipping.address_line_2}</p>}
                <p>
                  {shipping.city}, {shipping.state} - {shipping.pin_code}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No address recorded</p>
            )}
          </div>

          <div className="space-y-1 text-right">
            <p className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">
              Customer Information:
            </p>
            <p className="font-semibold text-gray-900">
              {order.customer?.name || shipping?.name || "Customer"}
            </p>
            {order.customer?.email && (
              <p className="text-gray-600">{order.customer.email}</p>
            )}
            {(order.customer?.phone || shipping?.phone) && (
              <p className="text-gray-600">{order.customer?.phone || shipping?.phone}</p>
            )}
            <p className="text-[11px] text-gray-500 pt-2">
              Status: <span className="uppercase font-semibold">{order.status}</span>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 text-gray-600 uppercase text-[10px]">
                <th className="py-2">Item Description</th>
                <th className="py-2">SKU</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {order.items.map((item) => (
                <tr key={item.id} className="text-gray-800">
                  <td className="py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="py-3 text-gray-500 font-mono text-[11px]">{item.sku || "—"}</td>
                  <td className="py-3 text-center font-bold">{item.quantity}</td>
                  <td className="py-3 text-right">
                    ₹{item.unit_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 text-right font-medium">
                    ₹{item.line_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-medium text-gray-900">
                ₹{order.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping (COD):</span>
              <span className="font-medium text-gray-900">₹0.00</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-300 pt-2">
              <span>Total Payable:</span>
              <span>₹{order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Delivery Instructions & Footer */}
        {order.notes && (
          <div className="rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 space-y-0.5">
            <p className="font-semibold text-gray-900 text-[11px]">Special Instructions:</p>
            <p>{order.notes}</p>
          </div>
        )}

        <div className="text-center text-[10px] text-gray-400 pt-8 border-t border-gray-100">
          Thank you for choosing {tenant.name}! For inquiries, please contact our store support.
        </div>
      </div>
    </div>
  );
}

