import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeUrlError extends Error {}

function isPrivateV4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function isPrivateV6(ip: string) {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("::ffff:")) return isPrivateV4(v.slice(7));
  return v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("ff");
}

/** 只允许访问公网 http(s) 地址，防止借探测功能访问内网（SSRF） */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("地址格式不正确");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new UnsafeUrlError("只支持 http 或 https 地址");
  if (url.username || url.password) throw new UnsafeUrlError("地址中不能包含账号密码");
  if (process.env.ALLOW_PRIVATE_PROBES === "1") return url;

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true }).catch(() => []);
  if (!addresses.length) throw new UnsafeUrlError("域名无法解析");
  for (const { address, family } of addresses) {
    if (family === 4 ? isPrivateV4(address) : isPrivateV6(address)) throw new UnsafeUrlError("不允许访问内网地址");
  }
  return url;
}

/** 规范化 Base Url：去掉末尾斜杠和重复的 /v1 */
export function apiUrl(base: string, path: string) {
  const trimmed = base.replace(/\/+$/, "").replace(/\/v1$/, "");
  return `${trimmed}${path}`;
}
