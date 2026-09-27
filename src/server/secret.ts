import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

let cached: Buffer | null = null;

/** 应用主密钥：生产环境应通过 APP_SECRET 提供；未提供时自动生成并保存在 .data/secret */
function masterKey(): Buffer {
  if (cached) return cached;
  let raw = process.env.APP_SECRET;
  if (!raw) {
    if (process.env.NODE_ENV === "production") console.warn("[secret] 未设置 APP_SECRET，使用 .data/secret；重新部署后已加密的探测 Key 将无法解密");
    const file = path.join(process.cwd(), ".data", "secret");
    if (!existsSync(file)) {
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, randomBytes(32).toString("hex"), { mode: 0o600 });
    }
    raw = readFileSync(file, "utf8").trim();
  }
  cached = createHash("sha256").update(raw).digest();
  return cached;
}

export const hmac = (value: string) => createHmac("sha256", masterKey()).update(value).digest("hex");

/** AES-256-GCM，用于加密存储站长的探测 Key */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${data.toString("base64url")}`;
}

export function decrypt(payload: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("bad ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export const maskKey = (key: string) => (key.length <= 8 ? "••••" : `${key.slice(0, 3)}••••${key.slice(-4)}`);
