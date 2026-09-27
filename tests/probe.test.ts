import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { detectSite, matchCatalog } from "@/server/adapter";
import { assertPublicUrl, UnsafeUrlError } from "@/server/probe/net";
import { runProbe, type Protocol } from "@/server/probe/stream";
import { runVerification } from "@/server/probe/verify-run";
import { startMockRelay } from "./mock-relay";

process.env.ALLOW_PRIVATE_PROBES = "1";

describe("流式探测", () => {
  let relay: Awaited<ReturnType<typeof startMockRelay>>;
  before(async () => {
    relay = await startMockRelay();
  });
  after(() => relay.close());

  const cases: [Protocol, string][] = [
    ["openai-chat", "gpt-5.6-sol"],
    ["openai-responses", "gpt-5.6-sol"],
    ["anthropic", "claude-opus-5"],
    ["gemini", "gemini-3.7-flash"],
  ];
  for (const [protocol, model] of cases) {
    it(`${protocol} 能测出首字并读到用量`, async () => {
      const r = await runProbe({ baseUrl: relay.url, apiKey: "sk-good", protocol, model });
      assert.equal(r.ok, true, r.error ?? "");
      assert.equal(r.state, "ok");
      assert.ok(r.ttftMs !== null && r.ttftMs >= 0);
      assert.equal(r.text, "OK");
      assert.ok(r.inputTokens && r.inputTokens > 0);
    });
  }

  it("Key 失效归类为密钥问题，不计入可用率", async () => {
    const r = await runProbe({ baseUrl: relay.url, apiKey: "sk-bad", protocol: "openai-chat", model: "gpt-5.6-sol" });
    assert.equal(r.state, "excluded");
    assert.equal(r.errorClass, "key");
    assert.match(r.error ?? "", /401/);
  });

  it("上游 502 归类为站点故障", async () => {
    const r = await runProbe({ baseUrl: relay.url, apiKey: "sk-down", protocol: "anthropic", model: "claude-opus-5" });
    assert.equal(r.state, "fail");
    assert.equal(r.errorClass, "site");
  });

  it("Base Url 末尾带 /v1 也能正确拼接", async () => {
    const r = await runProbe({ baseUrl: `${relay.url}/v1/`, apiKey: "sk-good", protocol: "openai-chat", model: "gpt-5.6-sol" });
    assert.equal(r.ok, true, r.error ?? "");
  });
});

describe("验真", () => {
  it("正常中转各项通过", async () => {
    const relay = await startMockRelay();
    const v = await runVerification({ baseUrl: relay.url, apiKey: "sk-good", protocol: "anthropic", model: "claude-opus-5" }, "anthropic");
    await relay.close();
    assert.equal(v.reachable, true);
    if (!v.reachable) return;
    const byKey = Object.fromEntries(v.checks.map((c) => [c.key, c.status]));
    assert.equal(byKey.fingerprint, "pass");
    assert.equal(byKey.quiz, "pass");
    assert.equal(byKey.injection, "pass");
    assert.equal(byKey.tokens, "pass");
    assert.equal(byKey.agent, "pass");
    assert.equal(v.status, "pass");
  });

  it("识别隐藏提示词注入与套壳模型", async () => {
    const relay = await startMockRelay({ injectTokens: 900, fakeModel: "gpt-4o-mini" });
    const v = await runVerification({ baseUrl: relay.url, apiKey: "sk-good", protocol: "anthropic", model: "claude-opus-5" }, "anthropic");
    await relay.close();
    assert.equal(v.reachable, true);
    if (!v.reachable) return;
    const byKey = Object.fromEntries(v.checks.map((c) => [c.key, c.status]));
    assert.equal(byKey.injection, "fail");
    assert.equal(byKey.fingerprint, "fail");
    assert.equal(v.status, "fail");
  });
});

describe("价格适配器", () => {
  it("识别 new-api，读出充值比例、分组倍率和模型", async () => {
    const relay = await startMockRelay();
    const info = await detectSite(relay.url, ["claude-opus-5", "gpt-5.6-sol"]);
    await relay.close();
    assert.equal(info.system, "new-api");
    assert.equal(info.rechargeRate, 1.5);
    const vip = info.groups.find((g) => g.name === "vip");
    assert.equal(vip?.ratio, 0.5);
    assert.deepEqual(vip?.models, ["claude-opus-5"]);
    assert.deepEqual(info.groups.find((g) => g.name === "default")?.models.sort(), ["claude-opus-5", "gpt-5.6-sol"]);
  });

  it("带日期后缀的模型名能映射到目录", () => {
    assert.equal(matchCatalog("gpt-5.6-sol-20260901", ["gpt-5.6-sol"]), "gpt-5.6-sol");
    assert.equal(matchCatalog("gpt-5.6-solar", ["gpt-5.6-sol"]), null);
  });
});

describe("SSRF 防护", () => {
  it("拒绝内网和本机地址", async () => {
    const prev = process.env.ALLOW_PRIVATE_PROBES;
    process.env.ALLOW_PRIVATE_PROBES = "0";
    for (const url of ["http://127.0.0.1:8080", "http://10.0.0.5", "http://192.168.1.1", "http://[::1]/", "http://169.254.169.254/latest/meta-data"]) {
      await assert.rejects(assertPublicUrl(url), UnsafeUrlError, url);
    }
    await assert.rejects(assertPublicUrl("ftp://example.com"), UnsafeUrlError);
    await assert.rejects(assertPublicUrl("http://user:pass@example.com"), UnsafeUrlError);
    process.env.ALLOW_PRIVATE_PROBES = prev;
  });
});
