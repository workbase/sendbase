import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

function encryptionKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY는 32자 이상이어야 합니다.")
  }
  return createHash("sha256").update(secret).digest()
}

export function encryptToken(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".")
}

export function decryptToken(value: string) {
  const [ivPart, tagPart, encryptedPart] = value.split(".")
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error("저장된 토큰 형식이 올바르지 않습니다.")
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivPart, "base64url")
  )
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex")
}
