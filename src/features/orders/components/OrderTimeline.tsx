import { Clock } from "lucide-react";
import type { OrderEventItem } from "../types";
import { OrderStatusBadge } from "./OrderStatusBadge";
import type { OrderStatus } from "../types";

export function OrderTimeline({ events }: { events: OrderEventItem[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        No status events recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
      {events.map((event, idx) => {
        const dateStr = new Date(event.created_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div key={event.id || idx} className="relative group">
            {/* Timeline bullet */}
            <div className="absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background border-2 border-primary text-primary">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <OrderStatusBadge status={event.status as OrderStatus} />
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {dateStr}
                </span>
              </div>

              {event.note && (
                <p className="text-xs text-foreground/80 leading-relaxed pt-0.5">
                  {event.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

