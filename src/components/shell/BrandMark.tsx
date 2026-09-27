export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden>
      <rect x="0.75" y="0.75" width="32.5" height="32.5" rx="3" fill="var(--color-ink)" />
      <circle cx="10" cy="8.5" r="2.6" fill="var(--color-source)" />
      <circle cx="24" cy="8.5" r="2.6" fill="var(--color-source)" />
      <path d="M10 11 C10 18, 17 16, 17 22 M24 11 C24 18, 17 16, 17 22" stroke="var(--color-card)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M17 22 L17 27 M11.5 27 H22.5" stroke="var(--color-signal)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
