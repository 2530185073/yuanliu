import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

/** 本地模拟中转站：实现四种流式协议和 new-api 的公开状态、价格接口，供测试使用 */

const ANSWERS: [RegExp, string][] = [
  [/37 乘以 43/, "1591"],
  [/strawberry/, "3"],
  [/倒过来/, "货验流源"],
  [/169/, "13"],
];

const answer = (prompt: string) => ANSWERS.find(([re]) => re.test(prompt))?.[1] ?? "OK";
const tokens = (text: string) => Math.ceil(text.length / 4.2) + 8;

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sse(res: ServerResponse, events: [string | null, unknown][]) {
  res.writeHead(200, { "content-type": "text/event-stream" });
  for (const [event, data] of events) res.write(`${event ? `event: ${event}\n` : ""}data: ${JSON.stringify(data)}\n\n`);
  res.end();
}

export interface MockOptions {
  /** 在每次请求里偷偷加的系统提示词 token 数，用于测试注入检测 */
  injectTokens?: number;
  /** 响应里谎报的模型名，用于测试指纹检测 */
  fakeModel?: string;
}

export async function startMockRelay(opts: MockOptions = {}): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/api/status") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ success: true, data: { system_name: "Mock Relay", price: 1.5, quota_display_type: "USD" } }));
    }
    if (req.method === "GET" && url.pathname === "/api/pricing") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(
        JSON.stringify({
          success: true,
          data: [
            { model_name: "claude-opus-5", enable_groups: ["default", "vip"] },
            { model_name: "gpt-5.6-sol-20260901", enable_groups: ["default"] },
            { model_name: "unknown-model", enable_groups: ["vip"] },
          ],
          group_ratio: { default: 1, vip: 0.5 },
          usable_group: { default: "默认分组", vip: "会员分组" },
        }),
      );
    }

    const auth = String(req.headers.authorization ?? req.headers["x-api-key"] ?? req.headers["x-goog-api-key"] ?? "");
    if (auth.includes("sk-bad")) {
      res.writeHead(401, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "Invalid API key" } }));
    }
    if (auth.includes("sk-down")) {
      res.writeHead(502, { "content-type": "text/plain" });
      return res.end("Bad Gateway");
    }

    const body = await readJson(req);
    const prompt: string =
      body.messages?.at(-1)?.content ?? body.input ?? body.contents?.[0]?.parts?.[0]?.text ?? "";
    const text = answer(prompt);
    const input = tokens(prompt) + (opts.injectTokens ?? 0);
    const wantsTool = Boolean(body.tools?.length);

    if (url.pathname === "/v1/chat/completions") {
      const model = opts.fakeModel ?? body.model;
      const id = "chatcmpl-mock";
      return sse(res, [
        [null, { id, model, choices: [{ delta: wantsTool ? { tool_calls: [{ index: 0, function: { name: "get_weather", arguments: '{"city":"北京"}' } }] } : { content: text } }] }],
        [null, { id, model, choices: [{ delta: {} , finish_reason: "stop" }], usage: { prompt_tokens: input, completion_tokens: 2 } }],
      ]);
    }
    if (url.pathname === "/v1/responses") {
      const response = { id: "resp_mock", object: "response", model: opts.fakeModel ?? body.model, usage: { input_tokens: input, output_tokens: 2 } };
      return sse(res, [
        ["response.created", { type: "response.created", response }],
        wantsTool
          ? ["response.output_item.added", { type: "response.output_item.added", item: { type: "function_call", name: "get_weather" } }]
          : ["response.output_text.delta", { type: "response.output_text.delta", delta: text }],
        ["response.completed", { type: "response.completed", response }],
      ]);
    }
    if (url.pathname === "/v1/messages") {
      return sse(res, [
        ["message_start", { type: "message_start", message: { id: "msg_mock", model: opts.fakeModel ?? body.model, usage: { input_tokens: input } } }],
        wantsTool
          ? ["content_block_start", { type: "content_block_start", content_block: { type: "tool_use", name: "get_weather" } }]
          : ["content_block_delta", { type: "content_block_delta", delta: { type: "text_delta", text } }],
        ["message_delta", { type: "message_delta", usage: { output_tokens: 2 } }],
      ]);
    }
    const gemini = url.pathname.match(/^\/v1beta\/models\/([^:]+):streamGenerateContent$/);
    if (gemini) {
      return sse(res, [
        [null, { responseId: "gem-mock", modelVersion: opts.fakeModel ?? decodeURIComponent(gemini[1]), candidates: [{ content: { parts: [wantsTool ? { functionCall: { name: "get_weather" } } : { text }] } }], usageMetadata: { promptTokenCount: input, candidatesTokenCount: 2 } }],
      ]);
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: `Page not found: ${url.pathname}` } }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(() => resolve())) };
}
