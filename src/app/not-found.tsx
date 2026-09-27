import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[560px] px-5 py-32 text-center">
      <p className="tnum text-[13px] text-fg-3">404</p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em]">页面不存在</h1>
      <Link href="/" className="btn btn-secondary mt-8">
        回到首页
      </Link>
    </div>
  );
}
