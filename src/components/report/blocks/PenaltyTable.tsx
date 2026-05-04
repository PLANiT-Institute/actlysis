import type { PenaltyTableBlock } from "@/lib/types";

export function PenaltyTable({ block }: { block: PenaltyTableBlock }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-red-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-red-700 text-white">
            <th className="px-4 py-2.5 text-left font-medium w-24">조문</th>
            <th className="px-4 py-2.5 text-left font-medium">위반 행위</th>
            <th className="px-4 py-2.5 text-left font-medium">처벌</th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-red-50"}>
              <td className="px-4 py-2.5 font-mono text-xs font-medium text-red-700 border-t border-red-100">
                {row.article}
              </td>
              <td className="px-4 py-2.5 text-slate-700 border-t border-red-100">
                {row.violation}
              </td>
              <td className="px-4 py-2.5 text-slate-800 font-medium border-t border-red-100">
                {row.penalty}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
