import { describe, it, expect } from "vitest";
import { categoryFormSchema, productFormSchema } from "./schemas";
import { parseDbError, friendlyMessage } from "@/lib/errors";

describe("Catalog Schemas & Validations", () => {
  describe("categoryFormSchema", () => {
    it("accepts valid category input", () => {
      const valid = {
        name: "Running Shoes",
        slug: "running-shoes",
        parentId: "123e4567-e89b-12d3-a456-426614174000",
        sortOrder: 1,
      };
      const result = categoryFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invalid slugs with uppercase or symbols", () => {
      const invalid = {
        name: "Shoes",
        slug: "Running Shoes!",
        sortOrder: 0,
      };
      const result = categoryFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects names shorter than 2 characters", () => {
      const invalid = {
        name: "A",
        slug: "a-cat",
        sortOrder: 0,
      };
      const result = categoryFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("productFormSchema", () => {
    it("accepts valid product input", () => {
      const valid = {
        name: "Classic Organic Cotton Tee",
        slug: "classic-organic-cotton-tee",
        description: "100% certified organic cotton.",
        price: 999,
        compareAtPrice: 1499,
        sku: "TEE-ORG-BLK-M",
        stock: 25,
        trackInventory: true,
        status: "active" as const,
        images: [
          {
            url: "https://example.com/tee-front.webp",
            alt: "Front view",
            position: 0,
          },
        ],
      };
      const result = productFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects when compare-at price is lower than selling price", () => {
      const invalid = {
        name: "Sale Item",
        slug: "sale-item",
        price: 1000,
        compareAtPrice: 800, // Invalid: compare price should be >= price
        stock: 5,
        trackInventory: true,
        status: "draft" as const,
        images: [],
      };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Compare-at price must be greater than or equal to selling price");
      }
    });

    it("rejects more than 8 product images", () => {
      const invalid = {
        name: "Photo Heavy Product",
        slug: "photo-heavy-product",
        price: 500,
        stock: 10,
        trackInventory: true,
        status: "draft" as const,
        images: Array.from({ length: 9 }).map((_, i) => ({
          url: `https://example.com/img-${i}.jpg`,
          position: i,
        })),
      };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Maximum 8 images allowed");
      }
    });
  });

  describe("Catalog DB Error Mapping", () => {
    it("parses PLAN_LIMIT_PRODUCTS and yields friendly upgrade guidance", () => {
      const rawError = "PLAN_LIMIT_PRODUCTS: your plan allows 30 products";
      const code = parseDbError(rawError);
      expect(code).toBe("PLAN_LIMIT_PRODUCTS");
      expect(friendlyMessage(code)).toContain("reached your plan's product limit");
    });

    it("parses PLAN_LIMIT_STAFF and yields friendly upgrade guidance", () => {
      const rawError = "PLAN_LIMIT_STAFF: your plan allows 2 team members";
      const code = parseDbError(rawError);
      expect(code).toBe("PLAN_LIMIT_STAFF");
      expect(friendlyMessage(code)).toContain("staff member limit");
    });

    it("parses PLAN_LIMIT_DOMAIN and yields friendly upgrade guidance", () => {
      const rawError = "PLAN_LIMIT_DOMAIN: custom domains are not included in your plan";
      const code = parseDbError(rawError);
      expect(code).toBe("PLAN_LIMIT_DOMAIN");
      expect(friendlyMessage(code)).toContain("Custom domains are not available");
    });

    it("maps 23505 unique constraint violation with context", () => {
      const rawError = { code: "23505", message: "duplicate key value violates unique constraint" };
      const code = parseDbError(rawError);
      expect(code).toBe("23505");
      expect(friendlyMessage(code, { field: "URL slug" })).toBe("That URL slug is already taken.");
    });
  });
});
