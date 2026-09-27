import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { yuan } from "@/lib/format";
import { classifyError, summarizeChecks, uptime } from "@/lib/probe";
import { decrypt, encrypt, maskKey } from "@/server/secret";

process.env.APP_SECRET ??= "test-secret-for-unit-tests";

describe("错误分类", () => {
  it("密钥与额度问题不算站点故障", () => {
    assert.equal(classifyError("HTTP 401: Invalid API key"), "key");
    assert.equal(classifyError("HTTP 429: API key 额度已用完"), "key");
    assert.equal(classifyError("HTTP 403: Insufficient account balance"), "key");
  });
  it("上游与超时算站点故障", () => {
    assert.equal(classifyError("HTTP 502 Bad Gateway"), "site");
    assert.equal(classifyError("超时（60 秒无响应）"), "site");
    assert.equal(classifyError("HTTP 403: upstream rejected this request; account scheduling was not changed"), "site");
  });
  it("纯限流与配置问题各自归类", () => {
    assert.equal(classifyError("HTTP 429: Too Many Requests"), "ratelimit");
    assert.equal(classifyError("HTTP 404: Page not found: /v1/responses"), "config");
  });
});

describe("可用率", () => {
  it("不计入的探测不影响分母", () => {
    assert.equal(uptime([{ state: "ok" }, { state: "fail" }, { state: "excluded" }, { state: "excluded" }] as never), 50);
    assert.equal(uptime([{ state: "excluded" }] as never), null);
  });
  it("验真汇总：有失败即未通过，两项存疑即存疑", () => {
    const c = (status: "pass" | "warn" | "fail" | "skip") => ({ key: status, label: "", status, value: "", detail: "" });
    assert.equal(summarizeChecks([c("pass"), c("fail")]).status, "fail");
    assert.equal(summarizeChecks([c("pass"), c("warn"), c("warn")]).status, "warn");
    assert.equal(summarizeChecks([c("pass"), c("warn"), c("skip")]).status, "pass");
  });
});

describe("格式化", () => {
  it("价格按量级取固定位数", () => {
    assert.equal(yuan(0.0025), "¥0.0025");
    assert.equal(yuan(0.05), "¥0.050");
    assert.equal(yuan(0.3), "¥0.30");
    assert.equal(yuan(16), "¥16.0");
    assert.equal(yuan(180), "¥180");
  });
});

describe("探测 Key 加密", () => {
  it("加密后能解密，密文每次不同，篡改会失败", () => {
    const a = encrypt("sk-live-123456789");
    const b = encrypt("sk-live-123456789");
    assert.notEqual(a, b);
    assert.equal(decrypt(a), "sk-live-123456789");
    assert.throws(() => decrypt(`${a.slice(0, -2)}xx`));
    assert.equal(maskKey("sk-live-123456789"), "sk-••••6789");
  });
});
