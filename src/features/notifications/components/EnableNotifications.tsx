"use client";

import * as React from "react";
import { Bell, Check, Loader2, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  isFCMSupported,
  getFCMToken,
  onForegroundMessage,
} from "@/lib/firebase/client";
import { saveNotificationTokenAction } from "../actions";

interface EnableNotificationsProps {
  tenantId?: string | null;
}

export function EnableNotifications({ tenantId }: EnableNotificationsProps) {
  const [status, setStatus] = React.useState<
    "checking" | "unsupported" | "default" | "granted" | "denied" | "registering"
  >("checking");

  // Check current browser permission and FCM support on mount
  React.useEffect(() => {
    let unmounted = false;

    async function checkSupport() {
      if (typeof window === "undefined" || !("Notification" in window)) {
        if (!unmounted) setStatus("unsupported");
        return;
      }

      const supported = await isFCMSupported();
      if (unmounted) return;

      if (!supported) {
        setStatus("unsupported");
        return;
      }

      const permission = Notification.permission;
      if (permission === "granted") {
        setStatus("granted");
      } else if (permission === "denied") {
        setStatus("denied");
      } else {
        setStatus("default");
      }
    }

    checkSupport();

    return () => {
      unmounted = true;
    };
  }, []);

  // Listen for foreground FCM messages and show sonner toasts when granted
  React.useEffect(() => {
    if (status !== "granted") return;

    const cleanup = onForegroundMessage((payload) => {
      const title =
        payload.notification?.title || payload.data?.title || "New Notification";
      const body = payload.notification?.body || payload.data?.body || "";
      const link = payload.data?.link;

      toast(title, {
        description: body,
        action: link
          ? {
              label: "View",
              onClick: () => {
                window.location.href = link;
              },
            }
          : undefined,
      });
    });

    return () => {
      cleanup();
    };
  }, [status]);

  // Handle explicit user opt-in click
  const handleEnable = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Notifications are not supported on this browser.");
      return;
    }

    setStatus("registering");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        toast.error("Notification permission was not granted.");
        return;
      }

      // Register background Service Worker with public configuration
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
      const messagingSenderId =
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "";
      const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "";

      const swQuery = `apiKey=${encodeURIComponent(apiKey)}&projectId=${encodeURIComponent(
        projectId
      )}&messagingSenderId=${encodeURIComponent(
        messagingSenderId
      )}&appId=${encodeURIComponent(appId)}`;

      const swRegistration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${swQuery}`
      );

      // Wait until service worker is active
      await navigator.serviceWorker.ready;

      // Obtain FCM Web Push Token
      const token = await getFCMToken(swRegistration);

      if (!token) {
        toast.error(
          "Could not retrieve device token. Please verify Firebase project settings."
        );
        setStatus("default");
        return;
      }

      // Save token to backend database via Server Action
      const result = await saveNotificationTokenAction({
        tenantId: tenantId || null,
        token,
        platform: "web",
      });

      if (!result.ok) {
        toast.error(result.message || "Failed to save notification subscription.");
        setStatus("default");
        return;
      }

      // Store token locally so we can cleanly unregister upon logout
      localStorage.setItem("sellora_fcm_token", token);

      setStatus("granted");
      toast.success("Push notifications enabled successfully!");
    } catch (err) {
      console.error("[EnableNotifications] Error:", err);
      toast.error("Failed to enable notifications. Please check console for details.");
      setStatus("default");
    }
  };

  if (status === "checking" || status === "unsupported") {
    return null;
  }

  if (status === "denied") {
    return (
      <Badge
        variant="outline"
        className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground border-border/80"
        title="Notifications are blocked in your browser site settings."
      >
        <BellOff className="h-3 w-3 text-muted-foreground" />
        <span>Push blocked</span>
      </Badge>
    );
  }

  if (status === "granted") {
    return (
      <div
        className="hidden md:inline-flex items-center gap-1 text-[11px] text-muted-foreground"
        title="Web push notifications are active for this device"
      >
        <Check className="h-3 w-3 text-emerald-500" />
        <span>Push on</span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnable}
      disabled={status === "registering"}
      className="h-8 gap-1.5 text-xs font-medium border-border/80"
    >
      {status === "registering" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      ) : (
        <Bell className="h-3.5 w-3.5 text-primary" />
      )}
      <span>{status === "registering" ? "Enabling..." : "Enable notifications"}</span>
    </Button>
  );
}

