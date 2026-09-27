import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CompareTray } from "@/components/compare/CompareTray";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { SiteHeader } from "@/components/shell/SiteHeader";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "源流 · AI 中转比价与验货", template: "%s · 源流" },
  description: "收录各渠道的 AI 中转货源，统一口径比价，持续探测与验真。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <CompareTray />
      </body>
    </html>
  );
}
