export function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seeded(seed: string) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof seeded>;

export const between = (r: Rng, min: number, max: number) => min + (max - min) * r();

export const int = (r: Rng, min: number, max: number) => Math.floor(between(r, min, max + 1));

export const chance = (r: Rng, p: number) => r() < p;

export function pick<T>(r: Rng, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)];
}

export function sample<T>(r: Rng, list: readonly T[], n: number): T[] {
  const pool = [...list];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  }
  return out;
}

export const round = (value: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
