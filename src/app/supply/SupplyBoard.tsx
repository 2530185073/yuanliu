"use client";

import Link from "next/link";
import { useState } from "react";
import { FAMILIES, type Family } from "@/lib/catalog";
import { pct, yuan } from "@/lib/format";
import type { VerifyStatus } from "@/lib/types";
import { Badge, VerifyBadge } from "@/components/ui/Badges";

export interface SupplyListItem {
  id: string;
  title: string;
  family: Family;
  supplierName: string;
  verified: boolean;
  sourceType: string;
  cnyPerUsd: number;
  terms: string;
  d7: number | null;
  verify: VerifyStatus | null;
}

export interface WantedListItem {
  id: string;
  title: string;
  family: Family;
  meta: string;
  target: string;
  responses: number;
  status: string;
}

export function SupplyBoard({ supplies, wanted }: { supplies: SupplyListItem[]; wanted: WantedListItem[] }) {
  const [tab, setTab] = useState<"offer" | "wanted">("offer");
  const [family, setFamily] = useState<Family | "all">("all");
  const offers = supplies.filter((s) => family === "all" || s.family === family);
  const posts = wanted.filter((w) => family === "all" || w.family === family);

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="seg">
          <button type="button" data-on={tab === "offer"} onClick={() => setTab("offer")}>
            供应 {supplies.length}
          </button>
          <button type="button" data-on={tab === "wanted"} onClick={() => setTab("wanted")}>
            求购 {wanted.length}
          </button>
        </div>
        <div className="seg scroll-x max-w-full">
          <button type="button" data-on={family === "all"} onClick={() => setFamily("all")}>
            全部
          </button>
          {FAMILIES.map((f) => (
            <button key={f.id} type="button" data-on={family === f.id} onClick={() => setFamily(f.id)}>
              {f.short}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {tab === "offer" ? (
          offers.length ? (
            <ul className="divide-y divide-line">
              {offers.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/supply/offers/${s.id}`}
                    className="grid gap-2 px-4 py-3.5 transition-colors hover:bg-subtle md:grid-cols-[minmax(0,1fr)_96px_150px_72px_76px] md:items-center md:gap-5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.title}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-fg-3">
                        {s.supplierName}
                        {s.verified && " · 已认证"} · {s.sourceType}
                      </span>
                    </span>
                    <span className="tnum font-semibold md:text-right">
                      {yuan(s.cnyPerUsd)}
                      <span className="text-[13px] font-normal text-fg-3">/刀</span>
                    </span>
                    <span className="truncate text-[13px] text-fg-2">{s.terms}</span>
                    <span className="tnum text-[13px] text-fg-2">{pct(s.d7)}</span>
                    {s.verify ? <VerifyBadge status={s.verify} /> : <span className="text-[13px] text-fg-3">待检测</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-16 text-center text-fg-3">暂无货源</p>
          )
        ) : posts.length ? (
          <ul className="divide-y divide-line">
            {posts.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/supply/wanted/${w.id}`}
                  className="grid gap-2 px-4 py-3.5 transition-colors hover:bg-subtle md:grid-cols-[minmax(0,1fr)_140px_72px_80px] md:items-center md:gap-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{w.title}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-fg-3">{w.meta}</span>
                  </span>
                  <span className="tnum text-[13px] text-fg-2">{w.target}</span>
                  <span className="text-[13px] text-fg-3">{w.responses} 个报价</span>
                  <span>
                    <Badge tone={w.status === "开放报价" ? "ok" : "neutral"}>{w.status}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-16 text-center text-fg-3">暂无求购</p>
        )}
      </div>
    </section>
  );
}
