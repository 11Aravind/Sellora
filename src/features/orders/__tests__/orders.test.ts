import { describe, it, expect } from "vitest";
import {
  cancelOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from "../schemas";

describe("Orders schemas and validations", () => {
  describe("cancelOrderSchema", () => {
    it("accepts an empty or undefined reason", () => {
      expect(cancelOrderSchema.safeParse({}).success).toBe(true);
      expect(cancelOrderSchema.safeParse({ reason: "" }).success).toBe(true);
    });

    it("accepts a reasonable length reason", () => {
      const res = cancelOrderSchema.safeParse({
        reason: "Customer requested cancellation via phone",
      });
      expect(res.success).toBe(true);
    });

    it("rejects reasons longer than 300 characters", () => {
      const res = cancelOrderSchema.safeParse({
        reason: "a".repeat(301),
      });
      expect(res.success).toBe(false);
    });
  });

  describe("updateOrderStatusSchema", () => {
    it("accepts valid status transitions", () => {
      expect(updateOrderStatusSchema.safeParse({ status: "confirmed" }).success).toBe(true);
      expect(updateOrderStatusSchema.safeParse({ status: "shipped" }).success).toBe(true);
      expect(updateOrderStatusSchema.safeParse({ status: "delivered" }).success).toBe(true);
    });

    it("rejects cancelled status since cancellations must use cancel_order RPC", () => {
      const res = updateOrderStatusSchema.safeParse({ status: "cancelled" });
      expect(res.success).toBe(false);
    });

    it("rejects arbitrary invalid status", () => {
      const res = updateOrderStatusSchema.safeParse({ status: "in_transit" });
      expect(res.success).toBe(false);
    });

    it("validates note length", () => {
      expect(
        updateOrderStatusSchema.safeParse({
          status: "shipped",
          note: "Shipped via Bluedart tracking #12345",
        }).success
      ).toBe(true);

      expect(
        updateOrderStatusSchema.safeParse({
          status: "shipped",
          note: "x".repeat(301),
        }).success
      ).toBe(false);
    });
  });

  describe("updatePaymentStatusSchema", () => {
    it("accepts valid payment statuses", () => {
      expect(updatePaymentStatusSchema.safeParse({ paymentStatus: "paid" }).success).toBe(true);
      expect(updatePaymentStatusSchema.safeParse({ paymentStatus: "refunded" }).success).toBe(true);
      expect(updatePaymentStatusSchema.safeParse({ paymentStatus: "failed" }).success).toBe(true);
      expect(updatePaymentStatusSchema.safeParse({ paymentStatus: "pending" }).success).toBe(true);
    });

    it("rejects unknown payment status", () => {
      const res = updatePaymentStatusSchema.safeParse({ paymentStatus: "completed" });
      expect(res.success).toBe(false);
    });
  });
});

