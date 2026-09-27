import type { Check } from "@/lib/types";
import { CHECK_MARK } from "@/components/ui/Badges";

/** 行是检查项，列是各份货；单列时退化为一张检查清单 */
export function CheckMatrix({ columns }: { columns: { label: string; checks: Check[] }[] }) {
  const keys = columns[0]?.checks ?? [];
  return (
    <div className="card scroll-x">
      <table className="w-full min-w-[520px] text-[13px]">
        {columns.length > 1 && (
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-fg-3">
              <th className="px-4 py-3 font-normal">检查项</th>
              {columns.map((c) => (
                <th key={c.label} className="max-w-40 truncate px-4 py-3 font-normal">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-line">
          {keys.map(({ key, label }) => (
            <tr key={key}>
              <td className="whitespace-nowrap px-4 py-2.5 text-fg-2">{label}</td>
              {columns.map((col) => {
                const check = col.checks.find((c) => c.key === key);
                if (!check) return <td key={col.label} className="px-4 py-2.5 text-fg-3" />;
                const mark = CHECK_MARK[check.status];
                return (
                  <td key={col.label} className="px-4 py-2.5" title={check.detail}>
                    <span className="mr-2 font-semibold" style={{ color: mark.color }}>
                      {mark.icon}
                    </span>
                    <span className="tnum text-fg-2">{check.value}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
