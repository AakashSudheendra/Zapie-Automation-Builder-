import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

function getKey() {
  const raw = process.env.ZAPPIE_ENCRYPTION_KEY
  if (!raw || !/^[a-f0-9]{64}$/i.test(raw)) {
    throw new Error("ZAPPIE_ENCRYPTION_KEY must be a 64-character hexadecimal key.")
  }
  return Buffer.from(raw, "hex")
}

export function encryptSecret(value: unknown) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv)
  const plaintext = Buffer.from(JSON.stringify(value), "utf8")
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".")
}

export function decryptSecret<T = unknown>(encoded: string): T {
  const [ivRaw, tagRaw, encryptedRaw] = encoded.split(".")
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Invalid encrypted credential.")
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivRaw, "base64url"))
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64url")), decipher.final()])
  return JSON.parse(plaintext.toString("utf8")) as T
}
