"use client";

import { useEffect } from "react";
import { replaceCompare } from "./store";

/** 打开对比链接时，把链接里的货同步到本地对比栏 */
export function CompareSync({ ids }: { ids: string[] }) {
  const key = ids.join(",");
  useEffect(() => {
    replaceCompare(key ? key.split(",") : []);
  }, [key]);
  return null;
}
