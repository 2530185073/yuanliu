import { familyLabel, type Family } from "./catalog";
import { between, chance, int, pick, round, type Rng } from "./rand";
import type { Check } from "./types";

interface CheckContext {
  family: Family;
  text: string;
  quality: number;
  claimed: number | null;
  measured: number | null;
  mystery: boolean;
  iqHtml: string | null;
  priceLabel?: string;
}

export function buildChecks(r: Rng, ctx: CheckContext): Check[] {
  const checks: Check[] = [];
  const good = (bias = 0) => r() < ctx.quality + bias;

  const fpRoll = r();
  checks.push(
    fpRoll < 0.06 + (1 - ctx.quality) * 0.1
      ? { key: "fingerprint", label: "模型身份指纹", status: "fail", value: "不一致", detail: "响应 ID 前缀与官方格式不符，返回结构疑似由其他模型套壳。" }
      : fpRoll < 0.16
        ? { key: "fingerprint", label: "模型身份指纹", status: "warn", value: "部分不符", detail: "usage 字段缺少缓存相关计数，疑似经过二次封装。" }
        : { key: "fingerprint", label: "模型身份指纹", status: "pass", value: "一致", detail: `响应 ID、stop_reason、流式事件顺序与 ${familyLabel(ctx.family)} 官方格式一致。` },
  );

  const quiz = Math.min(20, Math.round(between(r, 11, 17) + ctx.quality * 4));
  checks.push({
    key: "quiz",
    label: "能力题库",
    status: quiz >= 17 ? "pass" : quiz >= 14 ? "warn" : "fail",
    value: `${quiz}/20`,
    detail: "固定题 12 道 + 每日轮换题 8 道，覆盖多步推理、代码修复与长指令遵循。",
  });

  const dev = good(0.1) ? round(between(r, 0.2, 1.8), 1) : round(between(r, 2.5, 11), 1);
  checks.push({
    key: "tokens",
    label: "Token 计数一致性",
    status: dev < 2 ? "pass" : dev < 8 ? "warn" : "fail",
    value: `偏差 ${dev}%`,
    detail: "用官方 tokenizer 计算同一请求的输入 token 数，与站点返回的 usage 对比。",
  });

  if (/注入/.test(ctx.text) && !/无注入|不注入/.test(ctx.text)) {
    checks.push({ key: "injection", label: "隐藏提示词注入", status: "fail", value: `+${int(r, 900, 1600).toLocaleString("en-US")} tokens`, detail: "每次请求多出约千余个输入 token，存在隐藏系统提示词（分组说明中已声明）。" });
  } else if (chance(r, 0.1)) {
    checks.push({ key: "injection", label: "隐藏提示词注入", status: "warn", value: `+${int(r, 120, 380)} tokens`, detail: "输入 token 略高于预期，可能注入了简短的身份提示词。" });
  } else {
    checks.push({ key: "injection", label: "隐藏提示词注入", status: "pass", value: "+0 tokens", detail: "输入 token 与请求内容完全吻合，未发现额外注入。" });
  }

  checks.push(
    good(0.05)
      ? { key: "context", label: "长上下文", status: "pass", value: "5/5 命中", detail: "128K 大海捞针测试 5 个位置全部命中。" }
      : { key: "context", label: "长上下文", status: "warn", value: "3/5 命中", detail: "超过 64K 后命中率下降，疑似存在上下文截断。" },
  );

  const agentLabel = ctx.family === "anthropic" ? "Claude Code 兼容" : ctx.family === "openai" ? "Codex / Responses 兼容" : "工具调用";
  checks.push(
    good(0.15)
      ? { key: "agent", label: agentLabel, status: "pass", value: "通过", detail: "工具调用、并行调用、流式事件与 thinking 块均符合官方协议。" }
      : { key: "agent", label: agentLabel, status: "warn", value: "部分通过", detail: "并行工具调用的返回顺序异常，个别客户端可能报错。" },
  );

  checks.push(
    good(0.05)
      ? { key: "cache", label: "缓存计费", status: "pass", value: `命中 ${int(r, 86, 97)}%`, detail: "重复前缀请求产生缓存读取计数，并按缓存价计费。" }
      : { key: "cache", label: "缓存计费", status: "warn", value: "未命中", detail: "重复前缀未产生缓存折扣，缓存部分按全价计费。" },
  );

  if (!ctx.mystery) {
    checks.push({ key: "billing", label: "计费核对", status: "skip", value: "未核对", detail: "尚未进行平台自购核对，价格按站点宣称倍率计算。" });
  } else if (ctx.claimed === null && ctx.measured !== null) {
    checks.push({ key: "billing", label: "计费核对", status: "warn", value: `实测 ${ctx.measured}`, detail: `站点未公开数值倍率（宣称"${ctx.text.slice(0, 18)}"），平台按自购账号实测倍率计价。` });
  } else if (ctx.claimed !== null && ctx.measured !== null) {
    const ratio = ctx.measured / ctx.claimed;
    checks.push(
      ratio > 1.3
        ? { key: "billing", label: "计费核对", status: "fail", value: `宣称 ${ctx.claimed} · 实测 ${ctx.measured}`, detail: `自购账号发送已知 token 数的请求后，余额扣减对应的实际倍率比宣称高 ${Math.round((ratio - 1) * 100)}%。` }
        : ratio > 1.08
          ? { key: "billing", label: "计费核对", status: "warn", value: `宣称 ${ctx.claimed} · 实测 ${ctx.measured}`, detail: `实际扣费略高于宣称（+${Math.round((ratio - 1) * 100)}%），可能存在隐藏的模型倍率。` }
          : { key: "billing", label: "计费核对", status: "pass", value: `宣称 ${ctx.claimed} · 实测 ${ctx.measured}`, detail: "自购账号扣费与宣称倍率吻合。" },
    );
  }

  checks.push(
    ctx.iqHtml
      ? { key: "iq", label: "可视化智商检测", status: "pass", value: "已生成", detail: "固定提示词：用 SVG 画一个鹈鹕骑自行车的 2D 动画。原图见下方。" }
      : { key: "iq", label: "可视化智商检测", status: "skip", value: pick(r, ["排队中", "待检测"]), detail: "今日批次尚未轮到该货，结果生成后会自动展示。" },
  );

  return checks;
}
