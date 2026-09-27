import type { Family } from "@/lib/catalog";
import { summarizeChecks } from "@/lib/probe";
import type { Check } from "@/lib/types";
import { runProbe, type ProbeOutcome, type ProbeRequest } from "./stream";

const QUIZ: { q: string; a: (text: string) => boolean }[] = [
  { q: "37 乘以 43 等于多少？只回答数字。", a: (t) => /1591/.test(t) },
  { q: "单词 strawberry 里有几个字母 r？只回答数字。", a: (t) => /(^|\D)3(\D|$)/.test(t) },
  { q: "把“源流验货”四个字倒过来写，只输出结果。", a: (t) => t.includes("货验流源") },
  { q: "一个正数的平方是 169，这个数是多少？只回答数字。", a: (t) => /(^|\D)13(\D|$)/.test(t) },
];

const ID_PREFIX: Partial<Record<ProbeRequest["protocol"], RegExp>> = {
  "openai-chat": /^chatcmpl/,
  "openai-responses": /^resp/,
  anthropic: /^msg/,
};

const FAMILY_HINT: Record<Family, RegExp> = {
  openai: /gpt|o\d|codex/i,
  anthropic: /claude/i,
  google: /gemini/i,
  xai: /grok/i,
};

const LONG_PROMPT = `Please reply with the single word OK. ${"The quick brown fox jumps over the lazy dog. ".repeat(20)}`;

function fingerprintCheck(req: ProbeRequest, family: Family, r: ProbeOutcome): Check {
  const prefix = ID_PREFIX[req.protocol];
  const idOk = !prefix || (r.responseId ? prefix.test(r.responseId) : false);
  const model = r.responseModel ?? "";
  const otherFamily = (Object.entries(FAMILY_HINT) as [Family, RegExp][]).find(([f, re]) => f !== family && re.test(model) && !FAMILY_HINT[family].test(model));
  if (otherFamily) {
    return { key: "fingerprint", label: "模型身份指纹", status: "fail", value: "不一致", detail: `请求 ${req.model}，响应里的模型字段却是 ${model}。` };
  }
  if (!idOk || !model) {
    return { key: "fingerprint", label: "模型身份指纹", status: "warn", value: "部分不符", detail: `响应 ID ${r.responseId ?? "缺失"}，模型字段 ${model || "缺失"}，与官方格式不完全一致。` };
  }
  return { key: "fingerprint", label: "模型身份指纹", status: "pass", value: "一致", detail: `响应 ID 与模型字段（${model}）符合官方格式。` };
}

/** 真实验真：约 8 次小请求，返回检查结果与汇总 */
export async function runVerification(req: Omit<ProbeRequest, "prompt" | "maxTokens" | "withTool">, family: Family) {
  const base = await runProbe({ ...req, prompt: "hi", maxTokens: 50 });
  if (!base.ok) {
    return { reachable: false as const, error: base.error ?? "无法连接", outcome: base };
  }
  const checks: Check[] = [fingerprintCheck(req, family, base)];

  let correct = 0;
  for (const item of QUIZ) {
    const r = await runProbe({ ...req, prompt: item.q, maxTokens: 800 });
    if (r.ok && item.a(r.text)) correct++;
  }
  checks.push({
    key: "quiz",
    label: "能力题库",
    status: correct === QUIZ.length ? "pass" : correct >= QUIZ.length - 1 ? "warn" : "fail",
    value: `${correct}/${QUIZ.length}`,
    detail: "四道有确定答案的小题：乘法、数字母、倒序、开方。弱模型或被替换的模型常在这里出错。",
  });

  const long = await runProbe({ ...req, prompt: LONG_PROMPT, maxTokens: 20 });
  const shortIn = base.inputTokens;
  const longIn = long.ok ? long.inputTokens : null;
  if (shortIn === null || longIn === null) {
    checks.push({ key: "tokens", label: "Token 计数一致性", status: "warn", value: "未返回 usage", detail: "响应里没有 token 用量，无法核对计费口径。" });
  } else {
    const delta = longIn - shortIn;
    const expected = LONG_PROMPT.length / 4.2;
    const ratio = delta / expected;
    checks.push({
      key: "tokens",
      label: "Token 计数一致性",
      status: ratio > 0.6 && ratio < 1.6 ? "pass" : ratio > 0.4 && ratio < 2.2 ? "warn" : "fail",
      value: `偏差 ${Math.abs(Math.round((ratio - 1) * 100))}%`,
      detail: `多出约 ${Math.round(expected)} token 的文本后，输入用量增加了 ${delta}。`,
    });
  }

  if (shortIn === null) {
    checks.push({ key: "injection", label: "隐藏提示词注入", status: "skip", value: "无法判断", detail: "响应里没有输入 token 数。" });
  } else {
    const extra = Math.max(0, shortIn - 12);
    checks.push({
      key: "injection",
      label: "隐藏提示词注入",
      status: shortIn > 60 ? "fail" : shortIn > 25 ? "warn" : "pass",
      value: `+${extra} tokens`,
      detail: shortIn > 25 ? `只发送 "hi"，却计了 ${shortIn} 个输入 token，疑似被加了系统提示词。` : `只发送 "hi"，计 ${shortIn} 个输入 token，正常。`,
    });
  }

  checks.push({ key: "context", label: "长上下文", status: "skip", value: "每周执行", detail: "长文本测试成本较高，按周单独执行。" });

  const tool = await runProbe({ ...req, prompt: "请调用 get_weather 工具查询北京的天气。", maxTokens: 200, withTool: true });
  checks.push(
    tool.ok && tool.toolCalled
      ? { key: "agent", label: "工具调用", status: "pass", value: "通过", detail: "能按协议返回工具调用，Claude Code、Codex 等客户端可以正常使用。" }
      : { key: "agent", label: "工具调用", status: tool.ok ? "fail" : "warn", value: tool.ok ? "未调用" : "请求失败", detail: tool.ok ? "给了工具定义并明确要求调用，模型没有返回工具调用。" : (tool.error ?? "请求失败") },
  );

  checks.push({ key: "cache", label: "缓存计费", status: "skip", value: "每周执行", detail: "需要连续重复请求，按周单独执行。" });
  checks.push({ key: "billing", label: "计费核对", status: "skip", value: "未核对", detail: "需要平台自购账号，收录后由运营配置。" });
  checks.push({ key: "iq", label: "可视化智商检测", status: "skip", value: "按需生成", detail: "由运营在后台触发。" });

  const summary = summarizeChecks(checks);
  return { reachable: true as const, checks, ...summary, outcome: base };
}

const IQ_PROMPT = "创建一个完整的 HTML 页面，用 SVG 画一个鹈鹕骑自行车的 2D 动画。只输出 HTML 代码，不要解释，不要测试。";

/** 让模型画鹈鹕，返回清理过的 HTML（去掉脚本与外链，只在沙盒 iframe 中展示） */
export async function runIq(req: Omit<ProbeRequest, "prompt" | "maxTokens" | "withTool">) {
  const r = await runProbe({ ...req, prompt: IQ_PROMPT, maxTokens: 8000, timeoutMs: 180_000 });
  if (!r.ok) return { ok: false as const, error: r.error ?? "生成失败" };
  const code = r.text.match(/```(?:html)?\s*([\s\S]*?)```/)?.[1] ?? r.text;
  const html = code
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*(https?:|javascript:)[^"']*\2/gi, "")
    .slice(0, 400_000);
  if (!/<svg/i.test(html)) return { ok: false as const, error: "输出里没有 SVG" };
  return { ok: true as const, html };
}
