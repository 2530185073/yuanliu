import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { getSessionUser } from "@/server/auth";
import { BrandMark } from "./BrandMark";
import { NavLinks } from "./NavLinks";

export async function SiteHeader() {
  const user = await getSessionUser();
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
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {user ? (
            <>
              {user.role === "admin" && (
                <Link href="/admin" className="btn h-8 px-3 text-[13px] text-fg-2 hover:text-fg">
                  运营
                </Link>
              )}
              <Link href="/console" className="btn h-8 px-3 text-[13px] text-fg-2 hover:text-fg">
                后台
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="btn h-8 px-3 text-[13px] text-fg-3 hover:text-fg" title={user.email}>
                  退出
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn h-8 px-3 text-[13px] text-fg-2 hover:text-fg">
                登录
              </Link>
              <Link href="/login?next=/console" className="btn btn-primary h-8 px-3 text-[13px]">
                入驻
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-line md:hidden">
        <NavLinks compact />
      </div>
    </header>
  );
}
