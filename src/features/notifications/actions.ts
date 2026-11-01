"use server";

import { createClient } from "@/lib/supabase/server";
import {
  saveNotificationTokenSchema,
  markNotificationReadSchema,
  markAllNotificationsReadSchema,
  unregisterTokenSchema,
} from "./schemas";

export interface ActionResult<T = unknown> {
  ok: boolean;
  message?: string;
  data?: T;
}

type TokensTable = {
  upsert: (
    vals: Record<string, unknown>,
    opts: { onConflict: string }
  ) => {
    select: (col: string) => {
      single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
    };
  };
};

type NotificationsTable = {
  update: (vals: Record<string, unknown>) => {
    eq: (col: string, val: unknown) => {
      eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>;
      is: (col: string, val: unknown) => {
        or: (expr: string) => Promise<{ error: { message: string } | null }>;
      } & Promise<{ error: { message: string } | null }>;
    };
  };
};

/**
 * Saves or refreshes an FCM device token for the current user and tenant.
 */
export async function saveNotificationTokenAction(
  input: unknown
): Promise<ActionResult<{ id?: string }>> {
  const parsed = saveNotificationTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "Invalid payload" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Unauthorized" };
  }

  const { tenantId, token, platform } = parsed.data;

  // Upsert token onConflict (token) to update user_id, tenant_id, and last_seen_at
  const { data, error } = await (
    supabase.from("notification_tokens") as unknown as TokensTable
  )
    .upsert(
      {
        user_id: user.id,
        tenant_id: tenantId || null,
        token,
        platform,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: "token",
      }
    )
    .select("id")
    .single();

  if (error) {
    console.error("[saveNotificationTokenAction] Error:", error.message);
    return { ok: false, message: "Failed to save device token" };
  }

  return { ok: true, data: { id: data?.id } };
}

/**
 * Unregisters and removes an FCM device token (e.g., during logout or permission revoke).
 */
export async function unregisterNotificationTokenAction(
  token: string
): Promise<ActionResult> {
  const parsed = unregisterTokenSchema.safeParse({ token });
  if (!parsed.success) {
    return { ok: false, message: "Invalid token" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: true }; // Already logged out
  }

  const { error } = await supabase
    .from("notification_tokens")
    .delete()
    .eq("token", parsed.data.token)
    .eq("user_id", user.id);

  if (error) {
    console.error("[unregisterNotificationTokenAction] Error:", error.message);
    return { ok: false, message: "Failed to unregister token" };
  }

  return { ok: true };
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult> {
  const parsed = markNotificationReadSchema.safeParse({ id: notificationId });
  if (!parsed.success) {
    return { ok: false, message: "Invalid notification ID" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Unauthorized" };
  }

  const { error } = await (supabase.from("notifications") as unknown as NotificationsTable)
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[markNotificationReadAction] Error:", error.message);
    return { ok: false, message: "Failed to mark as read" };
  }

  return { ok: true };
}

/**
 * Marks all unread notifications as read for current user.
 */
export async function markAllNotificationsReadAction(
  tenantId?: string | null
): Promise<ActionResult> {
  const parsed = markAllNotificationsReadSchema.safeParse({ tenantId });
  if (!parsed.success) {
    return { ok: false, message: "Invalid tenant ID" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Unauthorized" };
  }

  const notifQuery = (supabase.from("notifications") as unknown as NotificationsTable)
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  const { error } = parsed.data.tenantId
    ? await notifQuery.or(`tenant_id.eq.${parsed.data.tenantId},tenant_id.is.null`)
    : await notifQuery;

  if (error) {
    console.error("[markAllNotificationsReadAction] Error:", error.message);
    return { ok: false, message: "Failed to mark all as read" };
  }

  return { ok: true };
}
