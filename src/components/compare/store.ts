"use client";

import { useSyncExternalStore } from "react";

export const MAX_COMPARE = 4;
const KEY = "yuanliu:compare";
const EMPTY: string[] = [];
const listeners = new Set<() => void>();

let lastRaw: string | null = null;
let cached: string[] = EMPTY;

function getSnapshot(): string[] {
  const raw = localStorage.getItem(KEY);
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      const parsed = JSON.parse(raw ?? "[]");
      cached = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string").slice(0, MAX_COMPARE) : EMPTY;
    } catch {
      cached = EMPTY;
    }
  }
  return cached;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function write(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  listeners.forEach((l) => l());
}

export function replaceCompare(ids: string[]) {
  const next = ids.slice(0, MAX_COMPARE);
  if (JSON.stringify(next) !== localStorage.getItem(KEY)) write(next);
}

export function useCompare() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  return {
    ids,
    full: ids.length >= MAX_COMPARE,
    has: (id: string) => ids.includes(id),
    toggle: (id: string) => write(ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX_COMPARE ? ids : [...ids, id]),
    remove: (id: string) => write(ids.filter((x) => x !== id)),
    clear: () => write([]),
  };
}
