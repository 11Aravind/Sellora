/**
 * Parses and maps database error messages from RPC `place_order` into friendly user-facing messages.
 */
export function mapPlaceOrderError(rawError: string): { code: string; message: string } {
  if (!rawError) {
    return { code: "UNKNOWN_ERROR", message: "Failed to place order. Please try again." };
  }

  if (rawError.includes("AUTH_REQUIRED")) {
    return {
      code: "AUTH_REQUIRED",
      message: "You must be signed in to place an order.",
    };
  }

  if (rawError.includes("EMPTY_CART")) {
    return {
      code: "EMPTY_CART",
      message: "Your cart is empty. Please add items before checking out.",
    };
  }

  if (rawError.includes("OUT_OF_STOCK")) {
    const parts = rawError.split("OUT_OF_STOCK:");
    const productName = parts.length > 1 ? parts[1].trim() : "one of the items";
    return {
      code: "OUT_OF_STOCK",
      message: `Sorry, "${productName}" is out of stock or does not have enough remaining inventory.`,
    };
  }

  if (rawError.includes("PRODUCT_UNAVAILABLE")) {
    return {
      code: "PRODUCT_UNAVAILABLE",
      message: "One or more products in your cart are no longer available. Please update your cart.",
    };
  }

  if (
    rawError.includes("PLAN_LIMIT_ORDERS") ||
    rawError.includes("STORE_UNAVAILABLE") ||
    rawError.includes("STORE_NOT_FOUND")
  ) {
    return {
      code: "STORE_UNAVAILABLE",
      message: "This store cannot accept orders right now. Please try again later or contact support.",
    };
  }

  if (rawError.includes("INVALID_ITEM")) {
    return {
      code: "INVALID_ITEM",
      message: "Invalid product or quantity specified. Please check your cart.",
    };
  }

  return {
    code: "CHECKOUT_FAILED",
    message: rawError.replace(/^ERROR:\s*/i, ""),
  };
}

