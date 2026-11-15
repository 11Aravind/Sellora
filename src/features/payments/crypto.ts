import "server-only";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM

function getEncryptionKey(): Buffer {
  const secret =
    process.env.PAYMENT_ENCRYPTION_KEY ||
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "saas_commerce_kit_default_payments_aes_key";

  // Derive a fixed 32-byte (256-bit) key using SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string (e.g. OAuth access token) using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (all hex encoded)
 */
export function encryptToken(text: string): string {
  if (!text) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token string.
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return "";
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format.");
  }

  const [ivHex, authTagHex, cipherTextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(cipherTextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

