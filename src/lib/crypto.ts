import crypto from "crypto";

function getKey(): Buffer {
  const raw = process.env.IMAP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "IMAP_ENCRYPTION_KEY ist nicht gesetzt. Bitte in der .env hinterlegen (32 zufällige Byte, base64-kodiert), um das IMAP-Postfach verschlüsselt speichern zu können.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "IMAP_ENCRYPTION_KEY muss 32 Byte (base64-kodiert) lang sein, z.B. erzeugt mit: openssl rand -base64 32",
    );
  }
  return key;
}

/** Verschlüsselt einen String mit AES-256-GCM. Format: iv.authTag.ciphertext (je base64). */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Ungültiges verschlüsseltes Format.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
