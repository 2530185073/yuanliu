import type { Metadata } from "next";
import { CheckRunner } from "./CheckRunner";

export const metadata: Metadata = { title: "一键验货" };

export default function CheckPage() {
  return (
    <div className="mx-auto max-w-[880px] px-5 pt-16">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">一键验货</h1>
      <p className="mt-2 text-fg-2">贴入任意中转的地址和 Key，一分钟出报告。</p>
      <div className="mt-10">
        <CheckRunner />
      </div>
    </div>
  );
}
