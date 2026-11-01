import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFirebaseAdminMessaging } from "@/lib/firebase/admin";
import type { NotifyTenantParams } from "./types";

/**
 * Dispatches an in-app notification and an FCM push notification to all tenant
 * members with the specified roles.
 *
 * Guaranteed never to throw into the caller (logs errors and safely completes).
 */
export async function notifyTenant({
  tenantId,
  roles,
  type,
  title,
  body,
  link,
}: NotifyTenantParams): Promise<void> {
  try {
    const admin = createAdminClient();

    // 1. Identify matching tenant members by role
    const { data: members, error: memberErr } = await admin
      .from("tenant_users")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .in("role", roles);

    const memberRows = (members || []) as unknown as Array<{ user_id: string }>;
    if (memberErr || memberRows.length === 0) {
      return;
    }

    const userIds = Array.from(new Set(memberRows.map((m) => m.user_id)));

    // 2. Insert in-app notifications (one row per user via service role)
    const notificationRows = userIds.map((userId) => ({
      tenant_id: tenantId,
      user_id: userId,
      type,
      title,
      body: body || null,
      link: link || null,
    }));

    type NotificationsInsertTable = {
      insert: (vals: Array<Record<string, unknown>>) => Promise<{ error: { message: string } | null }>;
    };

    const { error: insertErr } = await (
      admin.from("notifications") as unknown as NotificationsInsertTable
    ).insert(notificationRows);

    if (insertErr) {
      console.error("[notifyTenant] Error inserting notifications:", insertErr.message);
    }

    // 3. Retrieve FCM device tokens for those users
    const { data: tokenRows, error: tokenErr } = await admin
      .from("notification_tokens")
      .select("token")
      .in("user_id", userIds)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`);

    const tokenRowsList = (tokenRows || []) as unknown as Array<{ token: string }>;
    if (tokenErr || tokenRowsList.length === 0) {
      return;
    }

    const tokens = Array.from(new Set(tokenRowsList.map((r) => r.token)));
    const messaging = getFirebaseAdminMessaging();

    if (!messaging || tokens.length === 0) {
      return;
    }

    // 4. Send FCM Web Push via sendEachForMulticast in chunks of 500
    const CHUNK_SIZE = 500;
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);

      try {
        const response = await messaging.sendEachForMulticast({
          tokens: chunk,
          notification: {
            title,
            body,
          },
          data: {
            link: link || "/",
            type: String(type),
            tenantId,
          },
        });

        // 5. Clean up expired / unregistered tokens
        const staleTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const code = resp.error?.code;
            if (
              code === "messaging/registration-token-not-registered" ||
              code === "messaging/invalid-argument" ||
              code === "messaging/invalid-registration-token"
            ) {
              staleTokens.push(chunk[idx]);
            }
          }
        });

        if (staleTokens.length > 0) {
          const { error: delErr } = await admin
            .from("notification_tokens")
            .delete()
            .in("token", staleTokens);

          if (delErr) {
            console.error(
              "[notifyTenant] Error cleaning up stale tokens:",
              delErr.message
            );
          }
        }
      } catch (sendErr) {
        console.error("[notifyTenant] Multicast send error for batch:", sendErr);
      }
    }
  } catch (err) {
    console.error("[notifyTenant] Unexpected error:", err);
  }
}
