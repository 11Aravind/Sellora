import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { TenantPaymentGatewayConfig, SupportedPaymentMethod } from "./types";

interface PaymentGatewayRow {
  id: string;
  tenant_id: string;
  gateway_name: string;
  gateway_account_id: string | null;
  connection_status: "not_connected" | "connecting" | "connected" | "connection_failed" | "disconnected";
  token_expiry: string | null;
  is_online_enabled: boolean;
  is_cod_enabled: boolean;
  supported_methods: string[];
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Retrieves the sanitized payment gateway settings for a store.
 * Never exposes encrypted access tokens or secrets to callers.
 */
export async function getTenantPaymentGateway(
  tenantId: string
): Promise<TenantPaymentGatewayConfig> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenant_payment_gateways")
    .select(
      "id, tenant_id, gateway_name, gateway_account_id, connection_status, token_expiry, is_online_enabled, is_cod_enabled, supported_methods, metadata, created_at, updated_at"
    )
    .eq("tenant_id", tenantId)
    .eq("gateway_name", "razorpay")
    .maybeSingle();

  if (error || !data) {
    return {
      id: null,
      tenantId,
      gatewayName: "razorpay",
      gatewayAccountId: null,
      connectionStatus: "not_connected",
      isOnlineEnabled: false,
      isCodEnabled: true,
      supportedMethods: ["card", "upi", "netbanking", "wallet"],
      tokenExpiry: null,
      lastConnectedAt: null,
      merchantName: null,
      merchantEmail: null,
    };
  }

  const row = data as unknown as PaymentGatewayRow;
  const metadata = (row.metadata || {}) as Record<string, unknown>;

  return {
    id: row.id,
    tenantId: row.tenant_id,
    gatewayName: "razorpay",
    gatewayAccountId: row.gateway_account_id,
    connectionStatus: row.connection_status,
    isOnlineEnabled: row.is_online_enabled,
    isCodEnabled: row.is_cod_enabled,
    supportedMethods: (Array.isArray(row.supported_methods)
      ? row.supported_methods
      : ["card", "upi", "netbanking", "wallet"]) as SupportedPaymentMethod[],
    tokenExpiry: row.token_expiry,
    lastConnectedAt: (metadata.connected_at as string) || row.updated_at || null,
    merchantName: (metadata.merchant_name as string) || null,
    merchantEmail: (metadata.merchant_email as string) || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

