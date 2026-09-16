import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

@Injectable()
export class CalendarCryptoService {
  private readonly key: Buffer;

  constructor() {
    const secret =
      process.env.CALENDAR_CRYPTO_SECRET ||
      process.env.JWT_SECRET ||
      "memocycle_default_calendar_encryption_secret_key_32_bytes";
    // Derive exactly 32 bytes for AES-256
    this.key = createHash("sha256").update(secret).digest();
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns formatted string: ivHex:authTagHex:encryptedHex
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  }

  /**
   * Decrypts ciphertext formatted as ivHex:authTagHex:encryptedHex using AES-256-GCM.
   */
  decrypt(cipherPayload: string): string {
    const parts = cipherPayload.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid cipher payload format for calendar token");
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex!, "hex");
    const authTag = Buffer.from(authTagHex!, "hex");
    const encrypted = Buffer.from(encryptedHex!, "hex");

    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }

  /**
   * Masks tokens for safe logging and diagnostics without leaking sensitive data.
   */
  maskToken(token?: string | null): string {
    if (!token) return "(empty)";
    if (token.length <= 8) return "***";
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }
}
