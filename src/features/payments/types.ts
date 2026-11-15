export type PaymentGatewayStatus =
  | "not_connected"
  | "connecting"
  | "connected"
  | "connection_failed"
  | "disconnected";

export type SupportedPaymentMethod = "card" | "upi" | "netbanking" | "wallet";

export interface TenantPaymentGatewayConfig {
  id: string | null;
  tenantId: string;
  gatewayName: "razorpay";
  gatewayAccountId: string | null;
  connectionStatus: PaymentGatewayStatus;
  isOnlineEnabled: boolean;
  isCodEnabled: boolean;
  supportedMethods: SupportedPaymentMethod[];
  tokenExpiry: string | null;
  lastConnectedAt: string | null;
  merchantName?: string | null;
  merchantEmail?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface StorefrontPaymentSettings {
  isOnlineEnabled: boolean;
  isCodEnabled: boolean;
  supportedMethods: string[];
  gatewayName: string;
  connectionStatus: PaymentGatewayStatus;
}

