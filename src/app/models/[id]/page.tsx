import Link from "next/link";
import { notFound } from "next/navigation";
import { familyLabel, getModel, hasModel, MODELS } from "@/lib/catalog";
import { compareRows } from "@/lib/data";
import { FX, yuan } from "@/lib/format";
import { percentile } from "@/lib/probe";
import { ProtoModal } from "@/components/ui/Proto";
import { CompareBoard } from "./CompareBoard";

export function generateStaticParams() {
  return MODELS.map((m) => ({ id: m.id }));
}

export async function generateMetadata(props: PageProps<"/models/[id]">) {
  const { id } = await props.params;
  return { title: `${id} 比价` };
}

export default async function ModelPage(props: PageProps<"/models/[id]">) {
  const { id } = await props.params;
  if (!hasModel(id)) notFound();
  const model = getModel(id);
  const rows = compareRows(id);
  const live = rows.filter((r) => !r.excluded);
  const cheapest = [...live].sort((a, b) => a.output - b.output)[0];
  const stable = live.filter((r) => (r.h24 ?? 0) >= 99 && r.verify === "pass").length;
  const mid = percentile(live.map((r) => r.output), 50);
  const siblings = MODELS.filter((m) => m.family === model.family && m.id !== model.id);

  return (
    <div className="mx-auto max-w-[1440px] px-6 pt-10">
      <nav className="text-[13px] text-ink-3">
        <Link href="/models" className="link-underline hover:text-ink">
          按模型比价
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/models?family=${model.family}`} className="link-underline hover:text-ink">
          {familyLabel(model.family)}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{model.id}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-3 text-[12px]">
            <span className="rounded-sm bg-ink px-2 py-0.5 font-semibold text-card">{model.tier}</span>
            <span className="num text-ink-3">{model.contextK >= 1000 ? `${model.contextK / 1000}M` : `${model.contextK}K`} 上下文</span>
          </div>
          <h1 className="num mt-3 text-[44px] font-semibold leading-none tracking-tight md:text-[60px]">{model.id}</h1>
          <div className="mt-5 flex flex-wrap gap-2">
            {siblings.map((m) => (
              <Link key={m.id} href={`/models/${m.id}`} className="chip num">
                {m.id}
              </Link>
            ))}
          </div>
        </div>
        <div className="panel self-start rounded-md">
          <p className="border-b border-rule px-5 py-2.5 text-[12px] text-ink-3">官方价（演示值）· 每百万 token</p>
          <div className="grid grid-cols-3 divide-x divide-rule">
            {[
              ["输入", model.input],
              ["输出", model.output],
              ["缓存读", model.cacheRead],
            ].map(([label, usd]) => (
              <div key={label as string} className="px-5 py-3">
                <p className="text-[12px] text-ink-3">{label}</p>
                <p className="num mt-1 text-[20px] font-semibold">${usd}</p>
                <p className="num text-[11.5px] text-ink-3">≈ {yuan((usd as number) * FX)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-px overflow-hidden rounded-md border border-ink bg-ink md:grid-cols-4">
        <Kpi label="在售货" value={`${rows.length} 份`} sub={rows.length > live.length ? `${rows.length - live.length} 份探测密钥异常` : "全部正常探测中"} />
        <Kpi label="最低输出价" value={cheapest ? yuan(cheapest.output) : "—"} sub={cheapest ? `${cheapest.channelName} · 约官方 ${cheapest.fold.toFixed(2)} 折` : ""} accent />
        <Kpi label="中位输出价" value={mid !== null ? yuan(mid) : "—"} sub={`官方价 ${yuan(model.output * FX)}`} />
        <Kpi label="又稳又真" value={`${stable} 份`} sub="24h ≥ 99% 且验真通过" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-ink-3">
        <p>真实单价 = 官方单价 × 倍率 × 充值汇率（每 1 美元额度需要的人民币）。倍率优先使用平台自购实测值。</p>
        <ProtoModal className="font-semibold text-ink underline-offset-4 hover:underline" label="订阅这个模型的降价提醒" title={`订阅 ${model.id} 价格提醒`} subtitle="任一在售货降价、或出现新的更低价时通知你">
          <div className="space-y-2">
            {["邮件", "Telegram Bot", "飞书 / 企业微信 Webhook"].map((c, i) => (
              <label key={c} className="flex items-center gap-2 rounded-md border border-rule px-3 py-2">
                <input type="checkbox" defaultChecked={i === 0} /> {c}
              </label>
            ))}
            <p className="pt-2 text-[12px] text-ink-3">正式版需要登录后使用，这里仅展示交互。</p>
          </div>
        </ProtoModal>
      </div>

      {rows.length > 0 ? (
        <CompareBoard rows={rows} officialCny={model.output * FX} />
      ) : (
        <div className="panel mt-8 rounded-md p-10 text-center text-ink-3">暂时还没有渠道在卖这个模型。</div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="bg-card px-5 py-4">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className={`num mt-1 text-[26px] font-semibold leading-none ${accent ? "text-signal" : ""}`}>{value}</p>
      <p className="mt-1.5 truncate text-[11.5px] text-ink-3">{sub}</p>
    </div>
  );
}
