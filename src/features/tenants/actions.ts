"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/features/auth/queries";
import type { ActionResult } from "@/lib/errors";

type RpcCaller = (
  fn: string,
  args?: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Super Admin action to suspend or reactivate a store.
 * Calls RPC `admin_set_tenant_status(p_tenant, p_status)`.
 */
export async function adminSetTenantStatusAction(
  tenantId: string,
  status: "active" | "suspended"
): Promise<ActionResult<void>> {
  const admin = await isPlatformAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You are not authorized to perform super-admin operations.",
    };
  }

  if (status !== "active" && status !== "suspended") {
    return {
      ok: false,
      code: "INVALID_STATUS",
      message: "Invalid status value provided.",
    };
  }

  const supabase = await createClient();
  const callRpc = supabase.rpc as unknown as RpcCaller;

  const { error } = await callRpc("admin_set_tenant_status", {
    p_tenant: tenantId,
    p_status: status,
  });

  if (error) {
    return {
      ok: false,
      code: "RPC_ERROR",
      message: error.message || "Failed to update tenant status.",
    };
  }

  revalidatePath("/super-admin");
  revalidatePath("/super-admin/stores");
  revalidatePath(`/super-admin/stores/${tenantId}`);

  return {
    ok: true,
    data: undefined,
  };
}
