"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { destroySession, requestLoginCode, verifyLoginCode } from "@/server/auth";

export interface LoginState {
  step: "email" | "code";
  email: string;
  error?: string;
  devCode?: string;
}

const safeNext = (value: FormDataEntryValue | null) => {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/console";
};

export async function loginAction(prev: LoginState, form: FormData): Promise<LoginState> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { step: "email", email: String(form.get("email") ?? ""), error: "请输入有效的邮箱" };

  if (form.get("intent") === "send") {
    const result = await requestLoginCode(email.data);
    return result.ok ? { step: "code", email: email.data, devCode: result.devCode } : { step: "email", email: email.data, error: result.error };
  }

  const code = String(form.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) return { ...prev, step: "code", error: "验证码是 6 位数字" };
  const result = await verifyLoginCode(email.data, code);
  if (!result.ok) return { ...prev, step: "code", error: result.error };
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
