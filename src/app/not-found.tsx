import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col items-start px-6 py-24">
      <span className="stamp text-[18px]" style={{ "--stamp-color": "var(--color-bad)" } as React.CSSProperties}>
        查无此货
      </span>
      <h1 className="mt-8 font-display text-[40px] font-black">这个页面不在货架上。</h1>
      <p className="mt-3 text-[15px] text-ink-2">可能已经下架，或者链接写错了。</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn btn-ink">
          回到下游货
        </Link>
        <Link href="/supply" className="btn btn-line">
          去货源广场
        </Link>
      </div>
    </div>
  );
}
