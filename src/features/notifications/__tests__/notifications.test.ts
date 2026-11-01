import { describe, it, expect } from "vitest";
import {
  saveNotificationTokenSchema,
  markNotificationReadSchema,
  markAllNotificationsReadSchema,
  unregisterTokenSchema,
} from "../schemas";

describe("Notifications schemas and validations", () => {
  describe("saveNotificationTokenSchema", () => {
    it("accepts valid token and platform", () => {
      const res = saveNotificationTokenSchema.safeParse({
        token: "fcm_sample_token_1234567890_abcdef",
        platform: "web",
        tenantId: "11111111-1111-1111-1111-111111111111",
      });
      expect(res.success).toBe(true);
    });

    it("defaults platform to web if omitted", () => {
      const res = saveNotificationTokenSchema.safeParse({
        token: "fcm_sample_token_1234567890_abcdef",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.platform).toBe("web");
      }
    });

    it("rejects token that is too short", () => {
      const res = saveNotificationTokenSchema.safeParse({
        token: "short",
      });
      expect(res.success).toBe(false);
    });

    it("rejects invalid platform", () => {
      const res = saveNotificationTokenSchema.safeParse({
        token: "fcm_sample_token_1234567890_abcdef",
        platform: "windows",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("markNotificationReadSchema", () => {
    it("accepts valid UUID", () => {
      const res = markNotificationReadSchema.safeParse({
        id: "22222222-2222-2222-2222-222222222222",
      });
      expect(res.success).toBe(true);
    });

    it("rejects invalid UUID", () => {
      const res = markNotificationReadSchema.safeParse({
        id: "not-a-uuid",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("markAllNotificationsReadSchema", () => {
    it("accepts valid optional tenantId", () => {
      expect(markAllNotificationsReadSchema.safeParse({}).success).toBe(true);
      expect(
        markAllNotificationsReadSchema.safeParse({
          tenantId: "33333333-3333-3333-3333-333333333333",
        }).success
      ).toBe(true);
    });
  });

  describe("unregisterTokenSchema", () => {
    it("accepts valid token", () => {
      const res = unregisterTokenSchema.safeParse({
        token: "valid_token_device_998877665544",
      });
      expect(res.success).toBe(true);
    });

    it("rejects empty token", () => {
      const res = unregisterTokenSchema.safeParse({
        token: "",
      });
      expect(res.success).toBe(false);
    });
  });
});

