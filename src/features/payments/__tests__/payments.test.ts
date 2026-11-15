import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "../crypto";
import { updatePaymentPreferencesSchema } from "../schemas";

describe("Payment Gateway Encryption (AES-256-GCM)", () => {
  it("encrypts and decrypts OAuth tokens successfully with round-trip fidelity", () => {
    const originalToken = "rzp_live_oauth_access_token_1234567890abcdef";
    const encrypted = encryptToken(originalToken);

    expect(encrypted).not.toBe(originalToken);
    expect(encrypted.split(":")).toHaveLength(3); // iv : authTag : ciphertext

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it("handles empty or null inputs gracefully", () => {
    expect(encryptToken("")).toBe("");
    expect(decryptToken("")).toBe("");
  });

  it("throws error when decrypting tampered ciphertext or wrong auth tag", () => {
    const originalToken = "secret_token";
    const encrypted = encryptToken(originalToken);
    const [iv, tag, ciphertext] = encrypted.split(":");

    // Tamper ciphertext
    const tampered = `${iv}:${tag}:${ciphertext.slice(0, -2)}aa`;
    expect(() => decryptToken(tampered)).toThrow();
  });
});

describe("Payment Preferences Schema Validation", () => {
  it("validates valid payment preferences input", () => {
    const input = {
      isOnlineEnabled: true,
      isCodEnabled: true,
      supportedMethods: ["card", "upi", "netbanking", "wallet"],
    };

    const parsed = updatePaymentPreferencesSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("applies defaults correctly", () => {
    const input = {};
    const parsed = updatePaymentPreferencesSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isOnlineEnabled).toBe(false);
      expect(parsed.data.isCodEnabled).toBe(true);
      expect(parsed.data.supportedMethods).toEqual(["card", "upi", "netbanking", "wallet"]);
    }
  });

  it("rejects invalid payment method enum values", () => {
    const input = {
      isOnlineEnabled: true,
      isCodEnabled: true,
      supportedMethods: ["crypto_bitcoin"],
    };

    const parsed = updatePaymentPreferencesSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });
});

