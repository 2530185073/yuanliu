import { apiUrl, assertPublicUrl } from "./probe/net";

export interface DetectedGroup {
  name: string;
  ratio: number;
  description: string;
  models: string[];
}

export interface SiteInfo {
  system: "new-api" | "one-api" | "sub2api" | "未识别";
  title: string | null;
  rechargeRate: number | null;
  groups: DetectedGroup[];
  notes: string[];
}

async function getJson(url: string, timeoutMs = 10_000): Promise<unknown> {
  await assertPublicUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "yuanliu-adapter/1.0" }, signal: controller.signal, redirect: "error" });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const NEW_API_FIELDS = ["quota_display_type", "price", "usd_exchange_rate", "self_use_mode_enabled", "setup", "top_up_link"];

/** 把站点上的模型名映射到平台模型目录（完全一致或带日期后缀） */
export function matchCatalog(name: string, catalogIds: string[]) {
  const n = name.toLowerCase();
  return catalogIds.find((id) => n === id || n.startsWith(`${id}-`) || n.startsWith(`${id}@`)) ?? null;
}

/** 识别系统、充值比例、分组倍率与分组可用模型；识别不了的字段留空，由站长手填 */
export async function detectSite(siteUrl: string, catalogIds: string[]): Promise<SiteInfo> {
  const notes: string[] = [];
  const status = (await getJson(apiUrl(siteUrl, "/api/status"))) as { success?: boolean; data?: Record<string, unknown> } | null;
  let system: SiteInfo["system"] = "未识别";
  let title: string | null = null;
  let rechargeRate: number | null = null;

  if (status?.success && status.data) {
    const d = status.data;
    system = NEW_API_FIELDS.some((f) => f in d) ? "new-api" : "one-api";
    title = typeof d.system_name === "string" ? d.system_name : null;
    const price = Number(d.price);
    if (price > 0 && price < 50) rechargeRate = price;
    else notes.push("没有读到充值价格，请手动填写充值比例");
  } else {
    notes.push("没有识别到 new-api / one-api 的状态接口");
  }

  const groups: DetectedGroup[] = [];
  if (system !== "未识别") {
    const pricing = (await getJson(apiUrl(siteUrl, "/api/pricing"))) as {
      success?: boolean;
      data?: { model_name?: string; enable_groups?: string[] }[];
      group_ratio?: Record<string, number>;
      usable_group?: Record<string, string>;
    } | null;
    if (pricing?.success && Array.isArray(pricing.data)) {
      const ratios = pricing.group_ratio ?? { default: 1 };
      for (const [name, ratio] of Object.entries(ratios)) {
        const models = [
          ...new Set(
            pricing.data
              .filter((m) => !m.enable_groups || m.enable_groups.includes(name))
              .map((m) => (m.model_name ? matchCatalog(m.model_name, catalogIds) : null))
              .filter((v): v is string => Boolean(v)),
          ),
        ];
        groups.push({ name, ratio: Number(ratio) || 1, description: pricing.usable_group?.[name] ?? "", models });
      }
    } else {
      notes.push("价格接口需要登录或未开放，分组与倍率请手动填写");
    }
  }
  return { system, title, rechargeRate, groups, notes };
}
