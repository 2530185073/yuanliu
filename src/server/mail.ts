import type { Transporter } from "nodemailer";

let transporter: Transporter | null | undefined;

async function getTransporter(): Promise<Transporter | null> {
  if (transporter !== undefined) return transporter;
  const url = process.env.SMTP_URL;
  if (!url) {
    transporter = null;
    return null;
  }
  const nodemailer = await import("nodemailer");
  transporter = nodemailer.createTransport(url);
  return transporter;
}

export const mailConfigured = () => Boolean(process.env.SMTP_URL);

/** 未配置 SMTP 时只打印到服务端日志，返回 false */
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const t = await getTransporter();
  if (!t) {
    console.info(`[mail] SMTP 未配置，跳过发送 → ${to}：${subject}`);
    return false;
  }
  await t.sendMail({ from: process.env.MAIL_FROM ?? "源流 <no-reply@yuanliu.example>", to, subject, text });
  return true;
}
