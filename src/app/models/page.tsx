import type { Metadata } from "next";
import Link from "next/link";
import { FAMILIES, MODELS } from "@/lib/catalog";
import { compareRows } from "@/lib/data";
import { yuan } from "@/lib/format";

export const metadata: Metadata = { title: "按模型比价" };

export default function ModelsPage() {
  return (
    <div className="mx-auto max-w-[880px] px-5 pt-16">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">按模型比价</h1>
      <p className="mt-2 text-fg-2">选一个模型，看所有在卖它的货。</p>

      <div className="mt-12 space-y-12">
        {FAMILIES.map((f) => (
          <section key={f.id}>
            <h2 className="text-[13px] font-medium text-fg-3">{f.label}</h2>
            <ul className="card mt-3 divide-y divide-line overflow-hidden">
              {MODELS.filter((m) => m.family === f.id).map((m) => {
                const rows = compareRows(m.id).filter((r) => !r.excluded);
                const cheapest = Math.min(...rows.map((r) => r.output));
                return (
                  <li key={m.id}>
                    <Link href={`/models/${m.id}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-6 px-4 py-3.5 transition-colors hover:bg-subtle">
                      <span className="min-w-0">
                        <span className="font-medium">{m.id}</span>
                        <span className="tnum ml-3 text-[13px] text-fg-3">
                          官方 ${m.input} / ${m.output}
                        </span>
                      </span>
                      <span className="tnum text-[13px] text-fg-3">{rows.length} 份</span>
                      <span className="tnum w-24 text-right font-medium">{rows.length ? `${yuan(cheapest)} 起` : "—"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
