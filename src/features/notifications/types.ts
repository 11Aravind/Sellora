export type NotificationType =
  | "order.new"
  | "billing.failed"
  | "billing.past_due"
  | "trial.ending_soon_3d"
  | "trial.ending_soon_1d"
  | "limit.products_80"
  | "limit.products_100";

export interface NotificationItem {
  id: string;
  tenant_id: string | null;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface SaveTokenInput {
  tenantId?: string | null;
  token: string;
  platform?: "web" | "android" | "ios";
}

export interface NotifyTenantParams {
  tenantId: string;
  roles: Array<"owner" | "admin" | "staff">;
  type: NotificationType | string;
  title: string;
  body: string;
  link?: string;
}
