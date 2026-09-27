import type { Metadata } from "next";
import { CheckRunner } from "./CheckRunner";

export const metadata: Metadata = { title: "一键验货" };

export default function CheckPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 pt-12">
      <p className="eyebrow">一键验货 · BETA</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-display text-[40px] font-black leading-tight md:text-[52px]">
          买之前，<span className="text-signal">先验一验。</span>
        </h1>
        <p className="max-w-md text-[14px] leading-relaxed text-ink-2">
          手里有一个来路不明的中转 Key？贴进来，检测它是不是真模型、有没有降智和注入、协议兼不兼容 Claude Code 和 Codex。
        </p>
      </div>
      <div className="mt-10">
        <CheckRunner />
      </div>
    </div>
  );
}
