import { Badge } from "@/components/ui/badge";
import type { OrderStatus, OrderPaymentStatus } from "../types";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 capitalize font-medium">
          Pending
        </Badge>
      );
    case "confirmed":
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 capitalize font-medium">
          Confirmed
        </Badge>
      );
    case "shipped":
      return (
        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 capitalize font-medium">
          Shipped
        </Badge>
      );
    case "delivered":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 capitalize font-medium">
          Delivered
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 capitalize font-medium">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function PaymentStatusBadge({ status }: { status: OrderPaymentStatus }) {
  switch (status) {
    case "paid":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 capitalize font-medium">
          Paid
        </Badge>
      );
    case "refunded":
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 capitalize font-medium">
          Refunded
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 capitalize font-medium">
          Failed
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge variant="secondary" className="capitalize font-medium">
          Pending (COD)
        </Badge>
      );
  }
}

