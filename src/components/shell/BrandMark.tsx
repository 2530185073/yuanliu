export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path d="M7 6.5c0 5 5 4 5 9.5M17 6.5c0 5-5 4-5 9.5M12 16v2" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}
