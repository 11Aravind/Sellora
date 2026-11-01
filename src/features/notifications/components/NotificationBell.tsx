"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  ShoppingCart,
  CreditCard,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationItem } from "../types";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "../actions";

interface NotificationBellProps {
  notifications: NotificationItem[];
  unreadCount: number;
  tenantId?: string | null;
}

export function NotificationBell({
  notifications: initialNotifications,
  unreadCount: initialUnreadCount,
  tenantId,
}: NotificationBellProps) {
  const [readIds, setReadIds] = React.useState<string[]>([]);
  const [allMarkedRead, setAllMarkedRead] = React.useState(false);
  const [isMarkingAll, setIsMarkingAll] = React.useState(false);

  // Derive notifications and count optimistically without synchronous setState in effect
  const notifications = initialNotifications.map((n) =>
    allMarkedRead || readIds.includes(n.id)
      ? { ...n, read_at: n.read_at || new Date().toISOString() }
      : n
  );

  const unreadCount = allMarkedRead
    ? 0
    : Math.max(0, initialUnreadCount - readIds.length);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!readIds.includes(id)) {
      setReadIds((prev) => [...prev, id]);
    }

    await markNotificationReadAction(id);
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    setAllMarkedRead(true);

    try {
      await markAllNotificationsReadAction(tenantId || null);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order.new":
        return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
      case "billing.failed":
      case "billing.past_due":
        return <CreditCard className="h-4 w-4 text-destructive" />;
      case "limit.products_80":
      case "limit.products_100":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "trial.ending_soon_3d":
      case "trial.ending_soon_1d":
        return <Clock className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs animate-in zoom-in-75">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 max-h-[28rem] overflow-hidden flex flex-col p-0 shadow-lg border-border/80"
      >
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[11px] h-5 px-1.5 font-bold">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <CheckCheck className="h-3 w-3" />
              <span>Mark all read</span>
            </Button>
          )}
        </DropdownMenuLabel>

        {/* Notifications Scrollable List */}
        <div className="overflow-y-auto divide-y divide-border/50 max-h-[22rem]">
          {notifications.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-1.5">
              <Bell className="h-6 w-6 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-medium text-foreground">No notifications</p>
              <p className="text-[11px] text-muted-foreground">
                You will be notified about new orders and store alerts here.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const isUnread = !item.read_at;
              const formattedTime = formatDistanceToNow(new Date(item.created_at), {
                addSuffix: true,
              });

              return (
                <div
                  key={item.id}
                  className={`p-3.5 flex items-start gap-3 transition-colors ${
                    isUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-lg bg-muted border border-border/40">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs truncate ${
                          isUnread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                        }`}
                      >
                        {item.title}
                      </p>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>

                    {item.body && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground/80">
                      <span>{formattedTime}</span>

                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <button
                            onClick={(e) => handleMarkAsRead(item.id, e)}
                            className="hover:text-primary transition-colors inline-flex items-center gap-0.5"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                            <span>Read</span>
                          </button>
                        )}

                        {item.link && (
                          <Link
                            href={item.link}
                            onClick={() => {
                              if (isUnread) handleMarkAsRead(item.id);
                            }}
                            className="hover:text-primary transition-colors inline-flex items-center gap-0.5 font-medium text-foreground"
                          >
                            <span>Open</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

