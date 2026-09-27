"use client";

import Link from "next/link";
import { useState } from "react";
import { FAMILIES, familyLabel, type Family } from "@/lib/catalog";
import { ago, pct, yuan } from "@/lib/format";
import type { Supplier, SupplyItem, WantedPost } from "@/lib/supply";
import { Badge, VerifyBadge } from "@/components/ui/Badges";

interface Props {
  supplies: { item: SupplyItem; supplier: Supplier }[];
  wanted: { post: WantedPost; authorName: string }[];
}

const STATUS_TONE = { 开放报价: "ok", 洽谈中: "neutral", 已成交: "neutral" } as const;

export function SupplyBoard({ supplies, wanted }: Props) {
  const [tab, setTab] = useState<"offer" | "wanted">("offer");
  const [family, setFamily] = useState<Family | "all">("all");
  const offers = supplies.filter((s) => family === "all" || s.item.family === family).sort((a, b) => b.supplier.reputation - a.supplier.reputation);
  const posts = wanted.filter((w) => family === "all" || w.post.family === family);

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
        <div className="seg">
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
          <ul className="divide-y divide-line">
            {offers.map(({ item, supplier }) => (
              <li key={item.id}>
                <Link
                  href={`/supply/offers/${item.id}`}
                  className="grid gap-2 px-4 py-3.5 transition-colors hover:bg-subtle md:grid-cols-[minmax(0,1fr)_96px_150px_72px_76px] md:items-center md:gap-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-fg-3">
                      {supplier.name}
                      {supplier.verified && " · 已认证"} · {item.sourceType}
                    </span>
                  </span>
                  <span className="tnum font-semibold md:text-right">
                    {yuan(item.cnyPerUsd)}
                    <span className="text-[13px] font-normal text-fg-3">/刀</span>
                  </span>
                  <span className="truncate text-[13px] text-fg-2">
                    {item.settlement} · {item.minOrder}
                  </span>
                  <span className="tnum text-[13px] text-fg-2">{pct(item.probe.d7)}</span>
                  <VerifyBadge status={item.verification.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-line">
            {posts.map(({ post, authorName }) => (
              <li key={post.id}>
                <Link
                  href={`/supply/wanted/${post.id}`}
                  className="grid gap-2 px-4 py-3.5 transition-colors hover:bg-subtle md:grid-cols-[minmax(0,1fr)_140px_72px_80px] md:items-center md:gap-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{post.title}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-fg-3">
                      {authorName} · {familyLabel(post.family)} · {ago(post.postedAt)}
                    </span>
                  </span>
                  <span className="tnum text-[13px] text-fg-2">{post.target}</span>
                  <span className="text-[13px] text-fg-3">{post.responses.length} 个报价</span>
                  <span>
                    <Badge tone={STATUS_TONE[post.status]}>{post.status}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
