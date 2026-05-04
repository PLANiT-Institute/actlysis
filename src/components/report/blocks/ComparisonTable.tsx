import type { ComparisonTableBlock } from "@/lib/types";

export function ComparisonTable({ block }: { block: ComparisonTableBlock }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800 text-white">
            {block.headers.map((header, i) => (
              <th key={i} className="px-4 py-2.5 text-left font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr
              key={ri}
              className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-2.5 text-slate-700 border-t border-slate-100 ${
                    ci === 0 ? "font-medium text-slate-800" : ""
                  } ${
                    // Highlight "개정 후" or last column with blue if headers suggest before/after
                    block.headers.length >= 3 && ci === block.headers.length - 1
                      ? "text-blue-700"
                      : ""
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
