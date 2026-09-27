"use client";

import { useSyncExternalStore } from "react";

export const MAX_COMPARE = 4;
const KEY = "yuanliu:compare:v2";
const listeners = new Set<() => void>();

export interface CompareEntry {
  id: string;
  channel: string;
  group: string;
}

const EMPTY: CompareEntry[] = [];
let lastRaw: string | null = null;
let cached: CompareEntry[] = EMPTY;

const isEntry = (v: unknown): v is CompareEntry =>
  typeof v === "object" && v !== null && typeof (v as CompareEntry).id === "string" && typeof (v as CompareEntry).channel === "string";

function getSnapshot(): CompareEntry[] {
  const raw = localStorage.getItem(KEY);
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      const parsed = JSON.parse(raw ?? "[]");
      cached = Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, MAX_COMPARE) : EMPTY;
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

function write(entries: CompareEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_COMPARE)));
  listeners.forEach((l) => l());
}

export function replaceCompare(entries: CompareEntry[]) {
  if (JSON.stringify(entries.slice(0, MAX_COMPARE)) !== localStorage.getItem(KEY)) write(entries);
}

export function useCompare() {
  const entries = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const has = (id: string) => entries.some((e) => e.id === id);
  return {
    entries,
    full: entries.length >= MAX_COMPARE,
    has,
    toggle: (entry: CompareEntry) =>
      write(has(entry.id) ? entries.filter((e) => e.id !== entry.id) : entries.length >= MAX_COMPARE ? entries : [...entries, entry]),
    remove: (id: string) => write(entries.filter((e) => e.id !== id)),
    clear: () => write([]),
  };
}
