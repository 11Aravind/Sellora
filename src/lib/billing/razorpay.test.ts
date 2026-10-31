import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyWebhookSignature } from "./razorpay";

describe("verifyWebhookSignature", () => {
  const secret = "test_webhook_secret_key_12345";
  const rawBody = JSON.stringify({
    entity: "event",
    event: "subscription.charged",
    payload: {
      subscription: {
        entity: {
          id: "sub_123456",
          status: "active",
        },
      },
    },
  });

  const validSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  it("verifies a valid signature successfully", () => {
    const result = verifyWebhookSignature(rawBody, validSignature, secret);
    expect(result).toBe(true);
  });

  it("rejects an invalid/tampered signature", () => {
    const tamperedSignature = validSignature.slice(0, -4) + "abcd";
    const result = verifyWebhookSignature(rawBody, tamperedSignature, secret);
    expect(result).toBe(false);
  });

  it("rejects when an incorrect secret is used", () => {
    const result = verifyWebhookSignature(rawBody, validSignature, "wrong_secret");
    expect(result).toBe(false);
  });

  it("rejects when rawBody or signature is missing", () => {
    expect(verifyWebhookSignature("", validSignature, secret)).toBe(false);
    expect(verifyWebhookSignature(rawBody, "", secret)).toBe(false);
    expect(verifyWebhookSignature(rawBody, null, secret)).toBe(false);
    expect(verifyWebhookSignature(rawBody, validSignature, "")).toBe(false);
  });
});
