import Link from "next/link";
import { ProtoButton } from "@/components/ui/Proto";
import { BrandMark } from "./BrandMark";
import { NavLinks } from "./NavLinks";
import { Ticker } from "./Ticker";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-4 md:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <BrandMark />
            <span className="leading-none">
              <span className="block font-display text-[22px] font-black tracking-[0.08em]">源流</span>
              <span className="mt-1 hidden font-mono text-[10px] tracking-[0.2em] text-ink-3 sm:block">YUANLIU · RELAY EXCHANGE</span>
            </span>
          </Link>
          <div className="hidden md:block">
            <NavLinks />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ProtoButton className="btn btn-ghost hidden md:inline-flex" message="站长入驻流程：填网址和探测 Key，自动识别系统并拉取分组与价格。">
              站长入驻
            </ProtoButton>
            <ProtoButton className="btn btn-ghost hidden md:inline-flex" message="供应商入驻：提交测试 Key 后，上游货源会进入同一套探测与验真。">
              供应商入驻
            </ProtoButton>
            <ProtoButton className="btn btn-ink" message="登录：邮箱验证码、Linux.do、GitHub 三种方式。">
              登录
            </ProtoButton>
          </div>
        </div>
        <div className="border-t border-rule md:hidden">
          <NavLinks variant="strip" />
        </div>
      </div>
      <Ticker />
    </header>
  );
}
