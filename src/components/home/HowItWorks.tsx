import { OFFERINGS, STATS } from "@/lib/data";
import { yuan } from "@/lib/format";
import { percentile } from "@/lib/probe";

export function HowItWorks() {
  const prices = OFFERINGS.map((o) => o.daoPrice);
  const steps = [
    {
      no: "01",
      title: "收录",
      body: "站长提交，加上平台主动从论坛、群组发现新站。上游供应商也在这里挂货。",
      stat: `${STATS.channels} 家渠道 · ${STATS.offerings} 份货`,
    },
    {
      no: "02",
      title: "探测",
      body: "每 5 分钟流式请求一次，记录首字、吐字和错误类型。密钥问题不冤枉站点。",
      stat: `今日 ${STATS.probesPerDay.toLocaleString("en-US")} 次`,
    },
    {
      no: "03",
      title: "验真",
      body: "指纹、题库、token 计数、注入、长上下文、计费核对等 9 项，平台还会自购账号抽查。",
      stat: `${STATS.mystery} 份平台实测`,
    },
    {
      no: "04",
      title: "比价",
      body: "倍率和充值比例统一折算成刀价，再换算到每个模型的真实单价，放在一起排。",
      stat: `主流刀价 ${yuan(percentile(prices, 10) ?? 0)} – ${yuan(percentile(prices, 90) ?? 0)}`,
    },
  ];
  return (
    <section className="mx-auto max-w-[1440px] px-6 pb-14">
      <div className="grid border-y-2 border-ink md:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.no} className={`rise relative px-5 py-6 ${i ? "border-t border-rule md:border-l md:border-t-0" : ""}`} style={{ "--i": i + 4 } as React.CSSProperties}>
            <div className="flex items-baseline gap-3">
              <span className="num text-[13px] font-semibold text-signal">{s.no}</span>
              <h3 className="font-display text-[22px] font-black tracking-[0.1em]">{s.title}</h3>
              {i < steps.length - 1 && <span className="ml-auto hidden text-[18px] text-ink-3 md:block">→</span>}
            </div>
            <p className="mt-3 text-[13px] leading-[1.8] text-ink-2">{s.body}</p>
            <p className="num mt-4 inline-block border-t border-ink pt-2 text-[12px] font-semibold">{s.stat}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
