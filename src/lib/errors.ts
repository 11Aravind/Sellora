export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

export const DB_ERROR_CODES = [
  "PLAN_LIMIT_PRODUCTS",
  "PLAN_LIMIT_STAFF",
  "PLAN_LIMIT_ORDERS",
  "PLAN_LIMIT_DOMAIN",
  "SUBSCRIPTION_INACTIVE",
  "AUTH_REQUIRED",
  "FORBIDDEN",
  "OUT_OF_STOCK",
  "PRODUCT_UNAVAILABLE",
  "EMPTY_CART",
  "INVALID_ITEM",
  "STORE_NOT_FOUND",
  "STORE_UNAVAILABLE",
  "RESERVED_SLUG",
  "INVALID_SLUG",
  "INVALID_NAME",
  "TENANT_LIMIT",
  "PLAN_NOT_FOUND",
  "23505", // Postgres unique violation
  "42501", // Postgres insufficient privilege / RLS violation
] as const;

export type DbErrorCode = (typeof DB_ERROR_CODES)[number] | "UNKNOWN_ERROR";

export function parseDbError(error: unknown): string {
  if (!error) return "UNKNOWN_ERROR";

  let message = "";
  let code = "";

  if (typeof error === "string") {
    message = error;
  } else if (typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.code === "string") {
      code = errObj.code;
    }
    if (typeof errObj.message === "string") {
      message = errObj.message;
    } else if (typeof errObj.details === "string") {
      message = errObj.details;
    }
  }

  // Check specific Postgres SQLSTATE codes
  if (code === "23505" || message.includes("unique constraint") || message.includes("23505")) {
    return "23505";
  }
  if (
    code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("42501")
  ) {
    return "42501";
  }

  // Check prefix before ':' or exact match for domain error codes
  for (const expectedCode of DB_ERROR_CODES) {
    if (
      message.startsWith(expectedCode + ":") ||
      message.startsWith(expectedCode) ||
      message.includes(expectedCode)
    ) {
      return expectedCode;
    }
  }

  return code || "UNKNOWN_ERROR";
}

export function friendlyMessage(code: string, ctx?: { field?: string; limit?: number | string }): string {
  switch (code) {
    case "PLAN_LIMIT_PRODUCTS":
      return "You've reached your plan's product limit. Upgrade to add more products.";
    case "PLAN_LIMIT_STAFF":
      return "You've reached the staff member limit for your current subscription plan.";
    case "PLAN_LIMIT_ORDERS":
      return "Your store has reached its monthly order limit. Upgrade your plan to accept more orders.";
    case "PLAN_LIMIT_DOMAIN":
      return "Custom domains are not available on your current subscription plan.";
    case "SUBSCRIPTION_INACTIVE":
      return "Your subscription is inactive or expired. Please update your billing details to continue.";
    case "AUTH_REQUIRED":
      return "You must be signed in to perform this action.";
    case "FORBIDDEN":
    case "42501":
      return "You do not have permission to perform this action.";
    case "OUT_OF_STOCK":
      return "One or more items in your cart are currently out of stock.";
    case "PRODUCT_UNAVAILABLE":
      return "This product is not currently available for purchase.";
    case "EMPTY_CART":
      return "Your shopping cart is empty.";
    case "INVALID_ITEM":
      return "One or more items in your order are invalid.";
    case "STORE_NOT_FOUND":
      return "The requested store could not be found.";
    case "STORE_UNAVAILABLE":
      return "This store is temporarily unavailable or suspended.";
    case "RESERVED_SLUG":
      return "That store link is reserved and cannot be claimed.";
    case "INVALID_SLUG":
      return "Use 3-40 lowercase letters, numbers, or hyphens for your store link.";
    case "INVALID_NAME":
      return "Store name must be at least 2 characters long.";
    case "TENANT_LIMIT":
      return "You have reached the maximum allowed stores (5) for this account.";
    case "PLAN_NOT_FOUND":
      return "The selected subscription plan could not be found.";
    case "23505":
      return ctx?.field
        ? `That ${ctx.field} is already taken.`
        : "That store link or record already exists.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}

export function getErrorMessage(error: unknown): string {
  const code = parseDbError(error);
  if (code !== "UNKNOWN_ERROR") {
    return friendlyMessage(code);
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred. Please try again.";
}
