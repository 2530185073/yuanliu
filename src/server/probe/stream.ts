import { classifyError } from "@/lib/probe";
import type { ErrorClass } from "@/lib/types";
import { apiUrl, assertPublicUrl, UnsafeUrlError } from "./net";

export type Protocol = "openai-chat" | "openai-responses" | "anthropic" | "gemini";

export interface ProbeRequest {
  baseUrl: string;
  apiKey: string;
  protocol: Protocol;
  model: string;
  prompt?: string;
  system?: string;
  maxTokens?: number;
  timeoutMs?: number;
  withTool?: boolean;
}

export interface ProbeOutcome {
  ok: boolean;
  state: "ok" | "slow" | "fail" | "excluded";
  ttftMs: number | null;
  totalMs: number;
  tps: number | null;
  httpStatus: number | null;
  errorClass: ErrorClass | null;
  error: string | null;
  responseId: string | null;
  responseModel: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  text: string;
  toolCalled: boolean;
}

const TOOL = {
  name: "get_weather",
  description: "查询城市天气",
  parameters: { type: "object", properties: { city: { type: "string" } }, required: ["city"] },
};

function buildRequest(req: ProbeRequest): { url: string; headers: Record<string, string>; body: unknown } {
  const prompt = req.prompt ?? "hi";
  const max = req.maxTokens ?? 100;
  switch (req.protocol) {
    case "openai-responses":
      return {
        url: apiUrl(req.baseUrl, "/v1/responses"),
        headers: { authorization: `Bearer ${req.apiKey}` },
        body: {
          model: req.model,
          input: prompt,
          ...(req.system ? { instructions: req.system } : {}),
          max_output_tokens: max,
          stream: true,
          ...(req.withTool ? { tools: [{ type: "function", ...TOOL }] } : {}),
        },
      };
    case "anthropic":
      return {
        url: apiUrl(req.baseUrl, "/v1/messages"),
        headers: { "x-api-key": req.apiKey, authorization: `Bearer ${req.apiKey}`, "anthropic-version": "2023-06-01" },
        body: {
          model: req.model,
          max_tokens: max,
          ...(req.system ? { system: req.system } : {}),
          messages: [{ role: "user", content: prompt }],
          stream: true,
          ...(req.withTool ? { tools: [{ name: TOOL.name, description: TOOL.description, input_schema: TOOL.parameters }] } : {}),
        },
      };
    case "gemini":
      return {
        url: apiUrl(req.baseUrl, `/v1beta/models/${encodeURIComponent(req.model)}:streamGenerateContent?alt=sse`),
        headers: { "x-goog-api-key": req.apiKey, authorization: `Bearer ${req.apiKey}` },
        body: {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          ...(req.system ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
          generationConfig: { maxOutputTokens: max },
          ...(req.withTool ? { tools: [{ functionDeclarations: [TOOL] }] } : {}),
        },
      };
    default:
      return {
        url: apiUrl(req.baseUrl, "/v1/chat/completions"),
        headers: { authorization: `Bearer ${req.apiKey}` },
        body: {
          model: req.model,
          messages: [...(req.system ? [{ role: "system", content: req.system }] : []), { role: "user", content: prompt }],
          max_tokens: max,
          stream: true,
          stream_options: { include_usage: true },
          ...(req.withTool ? { tools: [{ type: "function", function: TOOL }] } : {}),
        },
      };
  }
}

interface Acc {
  text: string;
  id: string | null;
  model: string | null;
  input: number | null;
  output: number | null;
  tool: boolean;
}

/** 解析一个 SSE 事件（或非流式 JSON）并累积结果，返回本次是否产生了内容 */
function consume(protocol: Protocol, event: string, data: unknown, acc: Acc): boolean {
  const d = data as Record<string, unknown> & Record<string, never>;
  let produced = "";
  if (protocol === "openai-chat") {
    const choice = (d.choices as { delta?: Record<string, unknown>; message?: Record<string, unknown> }[] | undefined)?.[0];
    const part = choice?.delta ?? choice?.message;
    produced = String(part?.content ?? part?.reasoning_content ?? part?.reasoning ?? "");
    if (part?.tool_calls) acc.tool = true;
    acc.id ??= (d.id as string) ?? null;
    acc.model ??= (d.model as string) ?? null;
    const usage = d.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
    if (usage) {
      acc.input = usage.prompt_tokens ?? acc.input;
      acc.output = usage.completion_tokens ?? acc.output;
    }
  } else if (protocol === "openai-responses") {
    const type = (d.type as string) ?? event;
    if (type === "response.output_text.delta" || type === "response.reasoning_summary_text.delta") produced = String(d.delta ?? "");
    if (type === "response.output_item.added" && (d.item as { type?: string })?.type === "function_call") acc.tool = true;
    const resp = (d.response ?? (d.object === "response" ? d : undefined)) as Record<string, unknown> | undefined;
    if (resp) {
      acc.id ??= (resp.id as string) ?? null;
      acc.model ??= (resp.model as string) ?? null;
      const usage = resp.usage as { input_tokens?: number; output_tokens?: number } | undefined;
      if (usage) {
        acc.input = usage.input_tokens ?? acc.input;
        acc.output = usage.output_tokens ?? acc.output;
      }
      const output = resp.output as { type?: string; content?: { text?: string }[] }[] | undefined;
      if (output && !acc.text) {
        produced = output.flatMap((o) => o.content?.map((c) => c.text ?? "") ?? []).join("");
        if (output.some((o) => o.type === "function_call")) acc.tool = true;
      }
    }
  } else if (protocol === "anthropic") {
    const type = (d.type as string) ?? event;
    if (type === "message_start" || type === "message") {
      const msg = (type === "message" ? d : d.message) as { id?: string; model?: string; usage?: { input_tokens?: number }; content?: { type?: string; text?: string }[] };
      acc.id ??= msg?.id ?? null;
      acc.model ??= msg?.model ?? null;
      acc.input = msg?.usage?.input_tokens ?? acc.input;
      if (type === "message") {
        produced = msg.content?.map((c) => c.text ?? "").join("") ?? "";
        if (msg.content?.some((c) => c.type === "tool_use")) acc.tool = true;
      }
    }
    if (type === "content_block_start" && (d.content_block as { type?: string })?.type === "tool_use") acc.tool = true;
    if (type === "content_block_delta") {
      const delta = d.delta as { text?: string; thinking?: string; partial_json?: string };
      produced = delta?.text ?? delta?.thinking ?? delta?.partial_json ?? "";
    }
    if (type === "message_delta") acc.output = (d.usage as { output_tokens?: number })?.output_tokens ?? acc.output;
  } else {
    const parts = (d.candidates as { content?: { parts?: { text?: string; functionCall?: unknown }[] } }[] | undefined)?.[0]?.content?.parts ?? [];
    produced = parts.map((p) => p.text ?? "").join("");
    if (parts.some((p) => p.functionCall)) acc.tool = true;
    acc.id ??= (d.responseId as string) ?? null;
    acc.model ??= (d.modelVersion as string) ?? null;
    const usage = d.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
    if (usage) {
      acc.input = usage.promptTokenCount ?? acc.input;
      acc.output = usage.candidatesTokenCount ?? acc.output;
    }
  }
  acc.text += produced;
  return produced.length > 0 || acc.tool;
}

function errorMessage(body: string) {
  try {
    const j = JSON.parse(body);
    return String(j?.error?.message ?? j?.message ?? j?.error ?? body).slice(0, 300);
  } catch {
    return body.slice(0, 300) || "空响应";
  }
}

const fail = (start: number, httpStatus: number | null, errorClass: ErrorClass, error: string): ProbeOutcome => ({
  ok: false,
  state: errorClass === "key" || errorClass === "config" ? "excluded" : "fail",
  ttftMs: null,
  totalMs: Date.now() - start,
  tps: null,
  httpStatus,
  errorClass,
  error,
  responseId: null,
  responseModel: null,
  inputTokens: null,
  outputTokens: null,
  text: "",
  toolCalled: false,
});

/** 发一次流式请求，测首字时间、总耗时、吐字速度，并对失败原因分类 */
export async function runProbe(req: ProbeRequest): Promise<ProbeOutcome> {
  const start = Date.now();
  const timeoutMs = req.timeoutMs ?? 60_000;
  try {
    await assertPublicUrl(req.baseUrl);
  } catch (e) {
    return fail(start, null, "config", e instanceof UnsafeUrlError ? e.message : "地址不可用");
  }

  const { url, headers, body } = buildRequest(req);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const acc: Acc = { text: "", id: null, model: null, input: null, output: null, tool: false };
  let ttft: number | null = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/event-stream, application/json", "user-agent": "yuanliu-probe/1.0", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: "error",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const message = `HTTP ${res.status}: ${errorMessage(text)}`;
      return fail(start, res.status, classifyError(message), message);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("event-stream")) {
      const json = await res.json().catch(() => null);
      if (!json) return fail(start, res.status, "content", "响应不是有效的 JSON 或 SSE");
      if (consume(req.protocol, "", json, acc)) ttft = Date.now() - start;
    } else {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let event = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).replace(/\r$/, "");
          buffer = buffer.slice(nl + 1);
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) {
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const data = JSON.parse(payload);
              if ((data as { error?: unknown }).error) {
                const message = `stream error: ${errorMessage(payload)}`;
                return fail(start, res.status, classifyError(message), message);
              }
              if (consume(req.protocol, event, data, acc) && ttft === null) ttft = Date.now() - start;
            } catch {
              /* 忽略无法解析的行 */
            }
          } else if (!line) event = "";
        }
      }
    }

    const totalMs = Date.now() - start;
    if (ttft === null) return { ...fail(start, res.status, "content", "没有返回任何内容"), totalMs };
    const genMs = Math.max(totalMs - ttft, 1);
    const outTokens = acc.output ?? Math.ceil(acc.text.length / 3);
    return {
      ok: true,
      state: ttft > 10_000 ? "slow" : "ok",
      ttftMs: ttft,
      totalMs,
      tps: outTokens > 1 ? Math.round((outTokens / genMs) * 1000) : null,
      httpStatus: res.status,
      errorClass: null,
      error: null,
      responseId: acc.id,
      responseModel: acc.model,
      inputTokens: acc.input,
      outputTokens: acc.output,
      text: acc.text,
      toolCalled: acc.tool,
    };
  } catch (e) {
    const aborted = (e as Error)?.name === "AbortError";
    return fail(start, null, "site", aborted ? `超时（${Math.round(timeoutMs / 1000)} 秒无响应）` : `连接失败：${(e as Error)?.message ?? "未知错误"}`);
  } finally {
    clearTimeout(timer);
  }
}
