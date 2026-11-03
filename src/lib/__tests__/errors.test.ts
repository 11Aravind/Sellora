import { describe, it, expect } from "vitest";
import { parseDbError, friendlyMessage, isLimitError } from "../errors";

describe("Database Error Parsing & Sanitization", () => {
  describe("parseDbError", () => {
    it("returns UNKNOWN_ERROR on null/undefined", () => {
      expect(parseDbError(null)).toBe("UNKNOWN_ERROR");
      expect(parseDbError(undefined)).toBe("UNKNOWN_ERROR");
    });

    it("detects Postgres unique constraint 23505", () => {
      expect(parseDbError({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe("23505");
      expect(parseDbError("duplicate key value violates unique constraint")).toBe("23505");
    });

    it("detects RLS insufficient privilege 42501", () => {
      expect(parseDbError({ code: "42501", message: "new row violates row-level security policy" })).toBe("42501");
      expect(parseDbError("permission denied for table products")).toBe("42501");
    });

    it("extracts custom application error codes", () => {
      expect(parseDbError("PLAN_LIMIT_PRODUCTS: quota exceeded")).toBe("PLAN_LIMIT_PRODUCTS");
      expect(parseDbError("Error: PLAN_LIMIT_STAFF")).toBe("PLAN_LIMIT_STAFF");
      expect(parseDbError("SUBSCRIPTION_INACTIVE: trial expired")).toBe("SUBSCRIPTION_INACTIVE");
      expect(parseDbError("OUT_OF_STOCK: item 123 is sold out")).toBe("OUT_OF_STOCK");
      expect(parseDbError("FORBIDDEN: unauthorized operation")).toBe("FORBIDDEN");
    });
  });

  describe("friendlyMessage", () => {
    it("provides clear user-facing messages for plan limits", () => {
      expect(friendlyMessage("PLAN_LIMIT_PRODUCTS")).toContain("Upgrade to add more products");
      expect(friendlyMessage("PLAN_LIMIT_STAFF")).toContain("staff member limit");
      expect(friendlyMessage("OUT_OF_STOCK")).toContain("out of stock");
      expect(friendlyMessage("23505")).toContain("already exists");
    });

    it("falls back gracefully for unknown errors", () => {
      expect(friendlyMessage("NON_EXISTENT_CODE")).toContain("unexpected error");
    });
  });

  describe("isLimitError", () => {
    it("identifies plan limit codes correctly", () => {
      expect(isLimitError("PLAN_LIMIT_PRODUCTS")).toBe(true);
      expect(isLimitError("PLAN_LIMIT_STAFF")).toBe(true);
      expect(isLimitError("PLAN_LIMIT_ORDERS")).toBe(true);
      expect(isLimitError("PLAN_LIMIT_DOMAIN")).toBe(true);
      expect(isLimitError("SUBSCRIPTION_INACTIVE")).toBe(true);
      expect(isLimitError("FORBIDDEN")).toBe(false);
      expect(isLimitError("23505")).toBe(false);
    });
  });
});
