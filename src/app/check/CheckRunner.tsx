"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FAMILIES, MODELS, type Family } from "@/lib/catalog";
import { ms } from "@/lib/format";
import { summarizeChecks } from "@/lib/probe";
import { between, int, pick, seeded } from "@/lib/rand";
import type { Check } from "@/lib/types";
import { buildChecks } from "@/lib/verify";
import { CheckGrid } from "@/components/offer/CheckGrid";
import { VerifyStamp } from "@/components/ui/Stamp";

interface Step {
  key: string;
  label: string;
  detail: string;
}

interface Report {
  system: string;
  ttft: number;
  tps: number;
  checks: Check[];
  status: ReturnType<typeof summarizeChecks>["status"];
  score: number;
  iq: string;
}

const SAMPLE_IQ = ["/demo-iq/iq-01.html", "/demo-iq/iq-05.html", "/demo-iq/iq-09.html", "/demo-iq/iq-14.html"];

function simulate(url: string, family: Family, model: string): { steps: Step[]; report: Report } {
  const r = seeded(`check:${url}:${model}`);
  const system = pick(r, ["new-api", "new-api", "sub2api", "one-api"]);
  const ttft = Math.round(between(r, 700, 5200));
  const tps = int(r, 38, 140);
  const checks = buildChecks(r, {
    family,
    text: url,
    quality: between(r, 0.5, 0.97),
    claimed: null,
    measured: null,
    mystery: false,
    iqHtml: "sample",
  }).map((c) => (c.key === "billing" ? { ...c, detail: "一键验货不做计费核对：需要平台用普通用户身份自购账号，收录后自动进行。" } : c));
  const { status, score } = summarizeChecks(checks);
  const steps: Step[] = [
    { key: "connect", label: "连通性", detail: `TLS 正常 · ${int(r, 40, 220)}ms 握手` },
    { key: "system", label: "识别系统", detail: `${system} · 已读取分组与倍率接口` },
    { key: "stream", label: "流式心跳", detail: `首字 ${ms(ttft)} · 吐字 ${tps} t/s` },
    ...checks.map((c) => ({ key: c.key, label: c.label, detail: c.value })),
  ];
  return { steps, report: { system, ttft, tps, checks, status, score, iq: pick(r, SAMPLE_IQ) } };
}

export function CheckRunner() {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [family, setFamily] = useState<Family>("anthropic");
  const [model, setModel] = useState("claude-opus-5");
  const [steps, setSteps] = useState<Step[]>([]);
  const [done, setDone] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const running = steps.length > 0 && !report;
  const valid = /^https?:\/\/[^\s.]+\.[^\s]+/.test(url.trim()) && key.trim().length >= 8;

  function start() {
    timers.current.forEach(clearTimeout);
    const sim = simulate(url.trim().toLowerCase(), family, model);
    setSteps(sim.steps);
    setDone(0);
    setReport(null);
    sim.steps.forEach((_, i) => {
      timers.current.push(setTimeout(() => setDone(i + 1), 450 + i * 420));
    });
    timers.current.push(setTimeout(() => setReport(sim.report), 700 + sim.steps.length * 420));
  }

  function fillSample() {
    setUrl("https://api.sample-relay.example");
    setKey("sk-demo-0000000000000000");
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[400px_minmax(0,1fr)]">
      <form
        className="panel self-start rounded-md p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !running) start();
        }}
      >
        <label className="block">
          <span className="text-[12.5px] font-semibold">Base Url</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com"
            className="num mt-1.5 h-10 w-full rounded-md border border-rule bg-paper px-3 text-[13px] outline-none focus:border-ink"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-[12.5px] font-semibold">API Key</span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-…"
            autoComplete="off"
            className="num mt-1.5 h-10 w-full rounded-md border border-rule bg-paper px-3 text-[13px] outline-none focus:border-ink"
          />
        </label>
        <div className="mt-4">
          <span className="text-[12.5px] font-semibold">模型</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FAMILIES.map((f) => (
              <button
                key={f.id}
                type="button"
                className="chip"
                data-on={family === f.id}
                onClick={() => {
                  setFamily(f.id);
                  setModel(MODELS.find((m) => m.family === f.id)!.id);
                }}
              >
                {f.short}
              </button>
            ))}
          </div>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="num mt-2 h-10 w-full rounded-md border border-rule bg-paper px-2 text-[13px] outline-none focus:border-ink">
            {MODELS.filter((m) => m.family === family).map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={!valid || running} className="btn btn-ink mt-6 h-11 w-full disabled:cursor-not-allowed disabled:opacity-40">
          {running ? `验货中 · ${done}/${steps.length}` : report ? "重新验货" : "开始验货"}
        </button>
        <button type="button" onClick={fillSample} className="mt-3 w-full text-center text-[12.5px] font-semibold text-ink-3 underline-offset-4 hover:text-ink hover:underline">
          填入示例
        </button>
        <p className="mt-5 rounded-sm bg-paper px-3 py-2.5 text-[12px] leading-relaxed text-ink-3">
          Key 只用于本次检测，不会保存。建议使用额度受限的临时 Key；检测约消耗 $0.02 额度。
        </p>
      </form>

      <div className="min-w-0">
        {steps.length === 0 ? (
          <div className="panel flex h-full min-h-[360px] flex-col items-center justify-center rounded-md border-dashed p-10 text-center">
            <span className="stamp text-[18px]" style={{ "--stamp-color": "var(--color-ink-3)" } as React.CSSProperties}>
              待验货
            </span>
            <p className="mt-6 max-w-sm text-[13.5px] leading-relaxed text-ink-3">填入任意中转站的 Base Url 和 Key，平台会跑一遍心跳、协议兼容和 9 项验真，一分钟内出报告。没被收录的站也能测。</p>
          </div>
        ) : (
          <div className="space-y-6">
            <ol className="panel divide-y divide-rule/70 rounded-md">
              {steps.map((s, i) => {
                const state = i < done ? "done" : i === done && !report ? "running" : "pending";
                return (
                  <li key={s.key} className="flex items-center gap-4 px-5 py-2.5 text-[13px]">
                    <span className="num w-6 text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                        state === "done" ? "bg-ink text-card" : state === "running" ? "animate-spin border-2 border-signal border-t-transparent" : "border border-rule"
                      }`}
                    >
                      {state === "done" ? "✓" : ""}
                    </span>
                    <span className={state === "pending" ? "text-ink-3" : "font-semibold"}>{s.label}</span>
                    <span className="num ml-auto text-right text-[12px] text-ink-3">{state === "done" ? s.detail : state === "running" ? "检测中…" : ""}</span>
                  </li>
                );
              })}
            </ol>

            {report && (
              <section className="rise panel rounded-md">
                <div className="flex flex-wrap items-center gap-5 border-b border-rule p-5">
                  <VerifyStamp status={report.status} size="lg" />
                  <div>
                    <p className="font-display text-[22px] font-black">验货报告</p>
                    <p className="num mt-0.5 text-[12px] text-ink-3">
                      {url.trim()} · {model} · {report.system}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[12px] text-ink-3">验真分</p>
                    <p className="num text-[32px] font-semibold leading-none">{report.score}</p>
                  </div>
                </div>
                <div className="p-5">
                  <CheckGrid checks={report.checks} />
                  <div className="mt-5 grid gap-5 md:grid-cols-[1fr_280px]">
                    <iframe title="智商检测" src={report.iq} sandbox="" className="aspect-[16/9] w-full rounded-md border border-rule bg-card" />
                    <div className="flex flex-col justify-between gap-4 rounded-md border-2 border-dashed border-ink p-5">
                      <div>
                        <p className="font-display text-[17px] font-black">这个站还没被收录</p>
                        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">提交后平台会持续探测，并用自购账号做计费核对。站长认领前，渠道会以「平台收录」身份展示。</p>
                      </div>
                      <Link href="/" className="btn btn-ink w-full">
                        提交收录
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
