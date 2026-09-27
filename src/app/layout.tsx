import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono, Noto_Serif_SC } from "next/font/google";
import { CompareTray } from "@/components/compare/CompareTray";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { channelOf, OFFERINGS } from "@/lib/data";
import { SiteHeader } from "@/components/shell/SiteHeader";
import "./globals.css";

const serif = Noto_Serif_SC({
  variable: "--font-serif-sc",
  weight: ["600", "900"],
  preload: false,
  display: "swap",
});

const sans = Hanken_Grotesk({
  variable: "--font-latin-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "源流 · AI 中转货源比价与验货",
    template: "%s · 源流",
  },
  description: "收录各渠道的 AI 中转货源：真实单价、持续探测、多维验真，上游货源与下游中转在同一张表上比较。",
};

const COMPARE_LABELS = Object.fromEntries(OFFERINGS.map((o) => [o.id, { channel: channelOf(o).name, group: o.group }]));

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${serif.variable} ${sans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <CompareTray labels={COMPARE_LABELS} />
      </body>
    </html>
  );
}
