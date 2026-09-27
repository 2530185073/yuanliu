/** bars 编码见 lib/probe.ts 的 encodeBars：正数为首字毫秒，-1 失败，-2 不计入 */
export function UptimeBars({ bars, height = 20, className = "" }: { bars: number[]; height?: number; className?: string }) {
  const width = bars.length * 3;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={`block w-full ${className}`} style={{ height }} aria-label="最近 24 小时探测">
      {bars.map((v, i) => {
        const fill = v === -1 ? "#e5534b" : v === -2 ? "var(--color-line)" : v > 10_000 ? "#e3b341" : "#b4e5c0";
        return <rect key={i} x={i * 3} y={0} width={2} height={height} rx={1} fill={fill} />;
      })}
    </svg>
  );
}
