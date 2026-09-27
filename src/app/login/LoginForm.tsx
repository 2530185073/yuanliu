"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: "email", email: "" });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-[13px] text-fg-3">邮箱</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          readOnly={state.step === "code"}
          className={`input mt-1 ${state.step === "code" ? "bg-subtle text-fg-2" : ""}`}
        />
      </label>
      {state.step === "code" && (
        <label className="block">
          <span className="text-[13px] text-fg-3">验证码</span>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus className="input tnum mt-1 tracking-[0.3em]" />
        </label>
      )}
      {state.devCode && <p className="rounded-lg bg-subtle px-3 py-2 text-[13px] text-fg-2">开发模式未配置邮件，验证码：<span className="tnum font-semibold">{state.devCode}</span></p>}
      {state.error && <p className="text-[13px] text-bad">{state.error}</p>}
      <button type="submit" name="intent" value={state.step === "email" ? "send" : "verify"} disabled={pending} className="btn btn-primary w-full disabled:opacity-50">
        {pending ? "请稍候…" : state.step === "email" ? "发送验证码" : "登录"}
      </button>
      {state.step === "code" && (
        <button type="submit" name="intent" value="send" formNoValidate disabled={pending} className="w-full text-center text-[13px] text-fg-3 hover:text-fg">
          重新发送
        </button>
      )}
    </form>
  );
}
