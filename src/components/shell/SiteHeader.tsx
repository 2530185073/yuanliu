import Link from "next/link";
import { ProtoButton } from "@/components/ui/Proto";
import { BrandMark } from "./BrandMark";
import { NavLinks } from "./NavLinks";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/80 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-6 px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-fg">
          <BrandMark />
          <span className="text-[15px] font-semibold tracking-tight">源流</span>
        </Link>
        <div className="hidden flex-1 md:block">
          <NavLinks />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ProtoButton className="btn text-fg-2 hover:text-fg" message="登录：邮箱验证码、Linux.do 或 GitHub。">
            登录
          </ProtoButton>
          <ProtoButton className="btn btn-primary h-8 px-3 text-[13px]" message="入驻：填网址和探测 Key，自动识别分组与价格。">
            入驻
          </ProtoButton>
        </div>
      </div>
      <div className="border-t border-line md:hidden">
        <NavLinks compact />
      </div>
    </header>
  );
}
