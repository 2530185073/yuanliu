import { CHECK_INFO } from "@/lib/verify";
import type { Check } from "@/lib/types";
import { CHECK_MARK } from "@/components/ui/Badges";

/** 行是检查项，列是各份货；单列时额外显示每项的具体说明 */
export function CheckMatrix({ columns }: { columns: { label: string; checks: Check[] }[] }) {
  const keys = columns[0]?.checks ?? [];
  const single = columns.length === 1;
  return (
    <div>
      <div className="card scroll-x">
        <table className="w-full min-w-[520px] text-[13px]">
          {!single && (
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
                <td className="whitespace-nowrap px-4 py-2.5 align-top text-fg-2">{label}</td>
                {columns.map((col) => {
                  const check = col.checks.find((c) => c.key === key);
                  if (!check) return <td key={col.label} className="px-4 py-2.5" />;
                  const mark = CHECK_MARK[check.status];
                  return (
                    <td key={col.label} className="px-4 py-2.5 align-top" title={check.detail}>
                      <span className="mr-2 font-semibold" style={{ color: mark.color }}>
                        {mark.icon}
                      </span>
                      <span className="tnum text-fg-2">{check.value}</span>
                      {single && <p className="mt-0.5 text-[12px] text-fg-3">{check.detail}</p>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!single && (
        <details className="mt-4 text-[13px]">
          <summary className="cursor-pointer text-fg-3 hover:text-fg">每项检查测什么</summary>
          <dl className="mt-3 grid gap-x-8 gap-y-2 md:grid-cols-2">
            {keys.map(({ key, label }) => (
              <div key={key}>
                <dt className="text-fg-2">{label}</dt>
                <dd className="text-fg-3">{CHECK_INFO[key]}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
