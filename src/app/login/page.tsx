import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "登录" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/console";
  if (await getSessionUser()) redirect(target);

  return (
    <div className="mx-auto max-w-[360px] px-5 py-24">
      <h1 className="text-[28px] font-semibold tracking-[-0.03em]">登录</h1>
      <p className="mt-2 text-fg-2">用邮箱验证码登录，首次登录自动注册。</p>
      <div className="mt-8">
        <LoginForm next={target} />
      </div>
    </div>
  );
}
