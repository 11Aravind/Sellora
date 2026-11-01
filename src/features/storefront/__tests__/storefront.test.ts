import { describe, it, expect } from "vitest";
import { shippingAddressSchema, placeOrderInputSchema } from "../schemas";
import { mapPlaceOrderError } from "../errors";

describe("Storefront Validation & Error Handling", () => {
  describe("shippingAddressSchema", () => {
    it("accepts a valid Indian shipping address", () => {
      const validPayload = {
        fullName: "Rahul Sharma",
        phone: "9876543210",
        addressLine1: "Flat 204, Gokul Heights",
        addressLine2: "Near City Mall",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400001",
        notes: "Leave with security",
      };

      const result = shippingAddressSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects an invalid PIN code (not 6 digits)", () => {
      const invalidPinPayload = {
        fullName: "Rahul Sharma",
        phone: "9876543210",
        addressLine1: "Flat 204, Gokul Heights",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "12345", // only 5 digits
      };

      const result = shippingAddressSchema.safeParse(invalidPinPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("6 digits");
      }
    });

    it("rejects an invalid phone number", () => {
      const invalidPhonePayload = {
        fullName: "Rahul Sharma",
        phone: "123", // too short
        addressLine1: "Flat 204, Gokul Heights",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400001",
      };

      const result = shippingAddressSchema.safeParse(invalidPhonePayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("10 digits");
      }
    });

    it("rejects missing mandatory fields like fullName or addressLine1", () => {
      const incompletePayload = {
        phone: "9876543210",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400001",
      };

      const result = shippingAddressSchema.safeParse(incompletePayload);
      expect(result.success).toBe(false);
    });
  });

  describe("placeOrderInputSchema", () => {
    it("rejects an empty cart", () => {
      const emptyCartPayload = {
        tenantId: "11111111-1111-1111-1111-111111111111",
        items: [],
        shipping: {
          fullName: "Rahul Sharma",
          phone: "9876543210",
          addressLine1: "Flat 204, Gokul Heights",
          city: "Mumbai",
          state: "Maharashtra",
          pinCode: "400001",
        },
      };

      const result = placeOrderInputSchema.safeParse(emptyCartPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cart is empty");
      }
    });

    it("rejects item quantity greater than 100", () => {
      const invalidQtyPayload = {
        tenantId: "11111111-1111-1111-1111-111111111111",
        items: [
          {
            productId: "22222222-2222-2222-2222-222222222222",
            quantity: 101,
          },
        ],
        shipping: {
          fullName: "Rahul Sharma",
          phone: "9876543210",
          addressLine1: "Flat 204, Gokul Heights",
          city: "Mumbai",
          state: "Maharashtra",
          pinCode: "400001",
        },
      };

      const result = placeOrderInputSchema.safeParse(invalidQtyPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot exceed 100");
      }
    });
  });

  describe("mapPlaceOrderError", () => {
    it("maps OUT_OF_STOCK with product name correctly", () => {
      const err = mapPlaceOrderError("OUT_OF_STOCK: Organic Cotton T-Shirt");
      expect(err.code).toBe("OUT_OF_STOCK");
      expect(err.message).toContain("Organic Cotton T-Shirt");
      expect(err.message).toContain("out of stock");
    });

    it("maps AUTH_REQUIRED to friendly sign in prompt", () => {
      const err = mapPlaceOrderError("AUTH_REQUIRED");
      expect(err.code).toBe("AUTH_REQUIRED");
      expect(err.message).toContain("signed in");
    });

    it("maps PLAN_LIMIT_ORDERS to store capacity message", () => {
      const err = mapPlaceOrderError("PLAN_LIMIT_ORDERS: this store cannot accept more orders this month");
      expect(err.code).toBe("STORE_UNAVAILABLE");
      expect(err.message).toContain("cannot accept orders right now");
    });

    it("maps EMPTY_CART to empty cart notice", () => {
      const err = mapPlaceOrderError("EMPTY_CART");
      expect(err.code).toBe("EMPTY_CART");
      expect(err.message).toContain("Your cart is empty");
    });

    it("maps PRODUCT_UNAVAILABLE to unavailable items notice", () => {
      const err = mapPlaceOrderError("PRODUCT_UNAVAILABLE");
      expect(err.code).toBe("PRODUCT_UNAVAILABLE");
      expect(err.message).toContain("no longer available");
    });
  });
});

