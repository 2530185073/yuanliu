/** 票据式打孔分隔线，需放在带 p-5 内边距的卡片里 */
export function Perforation({ className = "" }: { className?: string }) {
  return (
    <div className={`relative -mx-5 border-t border-dashed border-rule ${className}`} aria-hidden>
      <span className="absolute -left-[9px] -top-[8px] h-4 w-4 rounded-full border border-rule bg-paper transition-colors [clip-path:inset(0_0_0_50%)] group-hover:border-ink" />
      <span className="absolute -right-[9px] -top-[8px] h-4 w-4 rounded-full border border-rule bg-paper transition-colors [clip-path:inset(0_50%_0_0)] group-hover:border-ink" />
    </div>
  );
}
