import { createClient } from "@/lib/supabase/server";
import type { NotificationItem } from "./types";

/**
 * Fetches notifications for the current authenticated user, optionally scoped to a tenant.
 */
export async function getUserNotifications(
  tenantId?: string | null,
  limit = 20
): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  let query = supabase
    .from("notifications")
    .select("id, tenant_id, user_id, type, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tenantId) {
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data as unknown as NotificationItem[];
}

/**
 * Fetches the count of unread notifications for the current authenticated user.
 */
export async function getUnreadNotificationsCount(
  tenantId?: string | null
): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (tenantId) {
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
  }

  const { count, error } = await query;
  if (error || count === null) {
    return 0;
  }

  return count;
}
