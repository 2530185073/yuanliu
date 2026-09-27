"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FAMILIES, MODELS, type Family } from "@/lib/catalog";
import { ms } from "@/lib/format";
import { summarizeChecks } from "@/lib/probe";
import { between, int, pick, seeded } from "@/lib/rand";
import type { Check } from "@/lib/types";
import { buildChecks } from "@/lib/verify";
import { CheckMatrix } from "@/components/offer/CheckMatrix";
import { VerifyBadge } from "@/components/ui/Badges";

interface Step {
  key: string;
  label: string;
  detail: string;
}

interface Report {
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
  const checks = buildChecks(r, { family, text: url, quality: between(r, 0.5, 0.97), claimed: null, measured: null, mystery: false, iqHtml: "sample" });
  const { status, score } = summarizeChecks(checks);
  const steps: Step[] = [
    { key: "connect", label: "连通性", detail: `${int(r, 40, 220)}ms` },
    { key: "system", label: "识别系统", detail: system },
    { key: "stream", label: "流式心跳", detail: `首字 ${ms(ttft)}` },
    ...checks.map((c) => ({ key: c.key, label: c.label, detail: c.value })),
  ];
  return { steps, report: { checks, status, score, iq: pick(r, SAMPLE_IQ) } };
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
    sim.steps.forEach((_, i) => timers.current.push(setTimeout(() => setDone(i + 1), 350 + i * 320)));
    timers.current.push(setTimeout(() => setReport(sim.report), 600 + sim.steps.length * 320));
  }

  return (
    <div className="space-y-6">
      <form
        className="card grid gap-4 p-5 md:grid-cols-[1fr_1fr_180px_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !running) start();
        }}
      >
        <label className="block">
          <span className="text-[13px] text-fg-3">Base Url</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com" className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-[13px] text-fg-3">API Key</span>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" autoComplete="off" className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-[13px] text-fg-3">模型</span>
          <select
            value={model}
            onChange={(e) => {
              const m = MODELS.find((x) => x.id === e.target.value)!;
              setModel(m.id);
              setFamily(m.family);
            }}
            className="input mt-1 pr-2"
          >
            {FAMILIES.map((f) => (
              <optgroup key={f.id} label={f.short}>
                {MODELS.filter((m) => m.family === f.id).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button type="submit" disabled={!valid || running} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-30">
          {running ? `${done}/${steps.length}` : "开始"}
        </button>
      </form>
      <div className="flex justify-between text-[13px] text-fg-3">
        <span>Key 不会被保存</span>
        <button
          type="button"
          className="hover:text-fg"
          onClick={() => {
            setUrl("https://api.sample-relay.example");
            setKey("sk-demo-0000000000000000");
          }}
        >
          填入示例
        </button>
      </div>

      {steps.length > 0 && !report && (
        <ul className="card divide-y divide-line">
          {steps.map((s, i) => (
            <li key={s.key} className={`flex items-center justify-between px-5 py-2.5 text-[13px] ${i < done ? "text-fg" : "text-fg-3"}`}>
              <span className="flex items-center gap-3">
                <span className={`h-1.5 w-1.5 rounded-full ${i < done ? "bg-ok" : i === done ? "animate-pulse bg-fg" : "bg-line-strong"}`} />
                {s.label}
              </span>
              <span className="tnum">{i < done ? s.detail : ""}</span>
            </li>
          ))}
        </ul>
      )}

      {report && (
        <div className="fade-in space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="tnum text-[40px] font-semibold tracking-tight">{report.score}</span>
              <VerifyBadge status={report.status} />
            </div>
            <Link href="/" className="btn btn-secondary">
              提交收录
            </Link>
          </div>
          <CheckMatrix columns={[{ label: model, checks: report.checks }]} />
          <figure className="card overflow-hidden">
            <iframe title="智商检测" src={report.iq} sandbox="" className="aspect-[16/9] w-full" />
          </figure>
        </div>
      )}
    </div>
  );
}
