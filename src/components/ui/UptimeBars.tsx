const COLOR = {
  ok: "var(--color-ok)",
  slow: "var(--color-warn)",
  fail: "var(--color-bad)",
  excluded: "var(--color-mute)",
};

/** Math.log 在 Node 与浏览器之间末位精度可能不同，坐标需取整，否则会触发 hydration 不一致 */
const fix = (v: number) => Math.round(v * 100) / 100;

/** bars 编码见 lib/probe.ts 的 encodeBars：正数为首字毫秒，-1 失败，-2 不计入 */
export function UptimeBars({ bars, height = 26, className = "" }: { bars: number[]; height?: number; className?: string }) {
  const width = bars.length * 4;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={`block w-full ${className}`} style={{ height }} aria-label="最近 24 小时探测结果">
      {bars.map((v, i) => {
        const state = v === -1 ? "fail" : v === -2 ? "excluded" : v > 10_000 ? "slow" : "ok";
        const h = state === "fail" || state === "excluded" ? height : fix(Math.max(5, Math.min(height, 5 + (Math.log(Math.max(v, 400)) - Math.log(400)) * (height / 3.9))));
        return <rect key={i} x={i * 4} y={height - h} width={2.6} height={h} rx={0.6} fill={COLOR[state]} opacity={state === "ok" ? 0.78 : 1} />;
      })}
    </svg>
  );
}
