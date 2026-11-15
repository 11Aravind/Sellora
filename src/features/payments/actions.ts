"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/features/auth/queries";
import { parseDbError, type ActionResult } from "@/lib/errors";
import {
  updatePaymentPreferencesSchema,
  type UpdatePaymentPreferencesInput,
} from "./schemas";
import type { PaymentGatewayStatus } from "./types";

type GatewayDbClient = {
  select: (cols: string) => {
    eq: (col: string, val: unknown) => {
      eq: (col2: string, val2: unknown) => {
        maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
      };
      single: () => Promise<{ data: unknown; error: Error | null }>;
    };
  };
  insert: (vals: Record<string, unknown>) => Promise<{ error: Error | null }>;
  update: (vals: Record<string, unknown>) => {
    eq: (col: string, val: unknown) => Promise<{ error: Error | null }>;
  };
};

/**
 * Ensures the authenticated user is an owner or admin of the given tenant.
 */
async function verifyTenantAdmin(
  tenantId: string
): Promise<ActionResult<{ userId: string; role: string; tenantSlug: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, code: "AUTH_REQUIRED", message: "You must be signed in." };
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("tenant_members")
    .select("role, tenants!inner(id, slug)")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You do not have permission to manage this store's payment settings.",
    };
  }

  const mem = member as unknown as {
    role: string;
    tenants: { id: string; slug: string } | Array<{ id: string; slug: string }>;
  };

  if (mem.role !== "owner" && mem.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only store owners and admins can configure payment gateways.",
    };
  }

  const tenant = Array.isArray(mem.tenants) ? mem.tenants[0] : mem.tenants;

  return {
    ok: true,
    data: { userId: user.id, role: mem.role, tenantSlug: tenant.slug },
  };
}

/**
 * Updates store payment preferences (Online payments, COD, and supported payment methods).
 */
export async function updatePaymentPreferencesAction(
  tenantId: string,
  input: UpdatePaymentPreferencesInput
): Promise<ActionResult<void>> {
  const authCheck = await verifyTenantAdmin(tenantId);
  if (!authCheck.ok) return authCheck;

  const parsed = updatePaymentPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid payment settings.",
    };
  }

  const supabase = await createClient();
  const gatewayTable = supabase.from("tenant_payment_gateways") as unknown as GatewayDbClient;

  // Check current connection status if user attempts to enable online payments
  const { data: currentGateway } = await gatewayTable
    .select("id, connection_status")
    .eq("tenant_id", tenantId)
    .eq("gateway_name", "razorpay")
    .maybeSingle();

  const existing = currentGateway as { id?: string; connection_status?: PaymentGatewayStatus } | null;
  const status = existing?.connection_status || "not_connected";

  if (parsed.data.isOnlineEnabled && status !== "connected") {
    return {
      ok: false,
      code: "GATEWAY_NOT_CONNECTED",
      message: "Please connect your Razorpay account before enabling online payments.",
    };
  }

  const payload = {
    tenant_id: tenantId,
    gateway_name: "razorpay",
    is_online_enabled: parsed.data.isOnlineEnabled,
    is_cod_enabled: parsed.data.isCodEnabled,
    supported_methods: parsed.data.supportedMethods,
  };

  let dbError: Error | null = null;
  if (existing?.id) {
    const res = await gatewayTable.update(payload).eq("id", existing.id);
    dbError = res.error;
  } else {
    const res = await gatewayTable.insert(payload);
    dbError = res.error;
  }

  if (dbError) {
    console.error("[updatePaymentPreferencesAction error]:", dbError);
    return {
      ok: false,
      code: parseDbError(dbError),
      message: dbError.message || "Failed to update payment preferences.",
    };
  }

  revalidatePath(`/dashboard/${authCheck.data.tenantSlug}/settings/payments`);
  return { ok: true, data: undefined };
}

/**
 * Initiates Razorpay OAuth Partner Onboarding flow.
 * If Razorpay Partner credentials are not configured yet, returns a graceful explanatory response.
 */
export async function initiateRazorpayConnectAction(
  tenantId: string
): Promise<ActionResult<{ authUrl: string } | { isConfigured: false; message: string }>> {
  const authCheck = await verifyTenantAdmin(tenantId);
  if (!authCheck.ok) return authCheck;

  const clientId = process.env.RAZORPAY_PARTNER_CLIENT_ID;
  const clientSecret = process.env.RAZORPAY_PARTNER_CLIENT_SECRET;

  // Requirement 4: If partner approval or credentials are not yet available,
  // do not pretend it's connected, and show an appropriate message.
  if (!clientId || !clientSecret) {
    return {
      ok: true,
      data: {
        isConfigured: false,
        message:
          "Razorpay connection will be available soon. Please configure RAZORPAY_PARTNER_CLIENT_ID and RAZORPAY_PARTNER_CLIENT_SECRET in your server environment to enable live partner onboarding.",
      },
    };
  }

  const reqHeaders = await headers();
  const host = reqHeaders.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const redirectUri = `${protocol}://${host}/api/auth/razorpay/callback`;

  // Cryptographically secure state with tenant ID and signature
  const nonce = crypto.randomBytes(16).toString("hex");
  const statePayload = Buffer.from(
    JSON.stringify({ tenantId, nonce, timestamp: Date.now() })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", clientSecret)
    .update(statePayload)
    .digest("hex");

  const signedState = `${statePayload}.${signature}`;

  // Update status to 'connecting'
  const supabase = await createClient();
  const gatewayTable = supabase.from("tenant_payment_gateways") as unknown as GatewayDbClient;

  const { data: existingRow } = await gatewayTable
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("gateway_name", "razorpay")
    .maybeSingle();

  const existingGateway = existingRow as { id?: string } | null;
  const connectPayload = {
    tenant_id: tenantId,
    gateway_name: "razorpay",
    connection_status: "connecting",
  };

  if (existingGateway?.id) {
    await gatewayTable.update(connectPayload).eq("id", existingGateway.id);
  } else {
    await gatewayTable.insert(connectPayload);
  }

  const authUrl = `https://auth.razorpay.com/authorize?client_id=${encodeURIComponent(
    clientId
  )}&response_type=code&scope=read_write&state=${encodeURIComponent(
    signedState
  )}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return { ok: true, data: { authUrl } };
}

/**
 * Disconnects the store's Razorpay account and resets credentials.
 */
export async function disconnectRazorpayAction(
  tenantId: string
): Promise<ActionResult<void>> {
  const authCheck = await verifyTenantAdmin(tenantId);
  if (!authCheck.ok) return authCheck;

  const supabase = await createClient();
  const gatewayTable = supabase.from("tenant_payment_gateways") as unknown as GatewayDbClient;

  const { error } = await gatewayTable
    .update({
      connection_status: "disconnected",
      is_online_enabled: false,
      encrypted_access_token: null,
      encrypted_refresh_token: null,
      token_expiry: null,
      metadata: {
        disconnected_at: new Date().toISOString(),
        disconnected_by: authCheck.data.userId,
      },
    })
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[disconnectRazorpayAction error]:", error);
    return {
      ok: false,
      code: parseDbError(error),
      message: error.message || "Failed to disconnect Razorpay account.",
    };
  }

  revalidatePath(`/dashboard/${authCheck.data.tenantSlug}/settings/payments`);
  return { ok: true, data: undefined };
}
