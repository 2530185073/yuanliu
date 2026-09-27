export type Family = "openai" | "anthropic" | "google" | "xai";

export const FAMILIES: { id: Family; label: string; short: string }[] = [
  { id: "openai", label: "OpenAI · GPT", short: "GPT" },
  { id: "anthropic", label: "Anthropic · Claude", short: "Claude" },
  { id: "google", label: "Google · Gemini", short: "Gemini" },
  { id: "xai", label: "xAI · Grok", short: "Grok" },
];

export const familyLabel = (id: Family) => FAMILIES.find((f) => f.id === id)?.short ?? id;

export function familyFromType(type: string): Family {
  if (type === "claude") return "anthropic";
  if (type === "gemini") return "google";
  if (type === "grok") return "xai";
  return "openai";
}

export interface CatalogModel {
  id: string;
  family: Family;
  tier: "旗舰" | "主力" | "轻量";
  /** 官方价，美元 / 百万 token（原型演示值） */
  input: number;
  output: number;
  cacheRead: number;
  contextK: number;
}

export const MODELS: CatalogModel[] = [
  { id: "gpt-6-astra", family: "openai", tier: "旗舰", input: 5, output: 40, cacheRead: 0.5, contextK: 400 },
  { id: "gpt-5.6-sol", family: "openai", tier: "主力", input: 2.5, output: 15, cacheRead: 0.25, contextK: 400 },
  { id: "gpt-5.6-terra", family: "openai", tier: "主力", input: 1.25, output: 10, cacheRead: 0.125, contextK: 400 },
  { id: "gpt-5.6-luna", family: "openai", tier: "轻量", input: 0.25, output: 2, cacheRead: 0.025, contextK: 400 },
  { id: "gpt-5.5", family: "openai", tier: "主力", input: 1.25, output: 10, cacheRead: 0.125, contextK: 272 },
  { id: "gpt-5.4", family: "openai", tier: "主力", input: 1.25, output: 10, cacheRead: 0.125, contextK: 272 },
  { id: "claude-opus-5", family: "anthropic", tier: "旗舰", input: 5, output: 25, cacheRead: 0.5, contextK: 1000 },
  { id: "claude-sonnet-5", family: "anthropic", tier: "主力", input: 3, output: 15, cacheRead: 0.3, contextK: 1000 },
  { id: "claude-fable-5", family: "anthropic", tier: "轻量", input: 1, output: 5, cacheRead: 0.1, contextK: 200 },
  { id: "claude-opus-4-8", family: "anthropic", tier: "旗舰", input: 5, output: 25, cacheRead: 0.5, contextK: 200 },
  { id: "gemini-3.7-flash", family: "google", tier: "主力", input: 0.5, output: 3, cacheRead: 0.05, contextK: 1000 },
  { id: "gemini-3.6-flash", family: "google", tier: "主力", input: 0.4, output: 2.5, cacheRead: 0.04, contextK: 1000 },
  { id: "gemini-3.5-flash", family: "google", tier: "轻量", input: 0.3, output: 2.5, cacheRead: 0.03, contextK: 1000 },
  { id: "grok-4.6", family: "xai", tier: "旗舰", input: 3, output: 15, cacheRead: 0.75, contextK: 256 },
  { id: "grok-4.5", family: "xai", tier: "主力", input: 3, output: 15, cacheRead: 0.75, contextK: 256 },
];

const byId = new Map(MODELS.map((m) => [m.id, m]));

export function getModel(id: string): CatalogModel {
  const model = byId.get(id);
  if (!model) throw new Error(`Unknown model ${id}`);
  return model;
}

export const hasModel = (id: string) => byId.has(id);

/** 输入输出按 3:1 加权的混合单价，用于排序 */
export const blend = (input: number, output: number) => (input * 3 + output) / 4;
