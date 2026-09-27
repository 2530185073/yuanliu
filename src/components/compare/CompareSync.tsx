"use client";

import { useEffect } from "react";
import { replaceCompare, type CompareEntry } from "./store";

/** 打开对比链接时，把链接里的货同步到本地对比栏 */
export function CompareSync({ entries }: { entries: CompareEntry[] }) {
  const key = JSON.stringify(entries);
  useEffect(() => {
    replaceCompare(JSON.parse(key));
  }, [key]);
  return null;
}
