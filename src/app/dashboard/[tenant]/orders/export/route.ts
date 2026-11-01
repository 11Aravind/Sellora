import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/features/auth/queries";
import { getTenantBySlug } from "@/features/tenants/queries";
import { getTenantOrders } from "@/features/orders/queries";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const user = await requireUser();
    const { tenant: slug } = await params;

    const result = await getTenantBySlug(slug, user.id);
    if (!result) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const { tenant } = result;
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get("status") || undefined;
    const paymentStatus = searchParams.get("payment") || undefined;
    const search = searchParams.get("q") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    // Fetch up to 5,000 orders matching filter
    const { orders } = await getTenantOrders(tenant.id, {
      status,
      paymentStatus,
      search,
      from,
      to,
      page: 1,
      pageSize: 5000,
    });

    const headers = [
      "Order Number",
      "Date",
      "Customer Name",
      "Customer Phone",
      "Customer Email",
      "Status",
      "Payment Status",
      "Items Count",
      "Total (INR)",
    ];

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = orders.map((o) => [
      escapeCsv(o.order_number),
      escapeCsv(new Date(o.created_at).toISOString()),
      escapeCsv(o.customer_name),
      escapeCsv(o.customer_phone),
      escapeCsv(o.customer_email),
      escapeCsv(o.status),
      escapeCsv(o.payment_status),
      escapeCsv(o.items_count),
      escapeCsv(o.total),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\r\n"
    );

    const filename = `orders-${slug}-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[CSV Export error]:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

