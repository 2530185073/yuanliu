import { STATS } from "@/lib/data";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink bg-ink text-card">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-black tracking-[0.08em]">源流</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
            AI 中转货源比价与验货平台。平台只做信息展示与撮合，不经手任何资金；赞助位不影响自然排序。
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-sm border border-white/20 px-2 py-1 font-mono text-[11px] tracking-wider text-white/60">
            原型演示 · 渠道名与域名均为虚构，指标分布参考公开数据
          </p>
        </div>
        <FooterCol title="综合分怎么算" items={["可用率 30%", "验真 25%", "真实单价 15%", "延迟与速度 15%", "口碑 10%", "站龄 5%"]} />
        <FooterCol title="探测规则" items={["心跳每 5 分钟一次", "密钥 / 配置问题不计入可用率", "原始记录只追加、不删改", `今日约 ${STATS.probesPerDay.toLocaleString("en-US")} 次探测`]} />
        <FooterCol title="上下游" items={["站长入驻", "供应商入驻", "发布求购", "禁售清单", "开放 API（即将上线）"]} />
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.18em] text-white/45">{title}</p>
      <ul className="mt-4 space-y-2 text-sm text-white/80">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
