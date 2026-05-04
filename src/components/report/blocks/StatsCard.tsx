import type { StatsBlock } from "@/lib/types";

export function StatsCard({ block }: { block: StatsBlock }) {
  return (
    <div className={`grid gap-3 ${block.items.length === 1 ? "grid-cols-1" : block.items.length === 2 ? "grid-cols-2" : block.items.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
      {block.items.map((item, i) => (
        <div
          key={i}
          className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center"
        >
          <div className="text-2xl font-bold text-blue-700">{item.value}</div>
          <div className="text-sm font-medium text-slate-700 mt-1">{item.label}</div>
          {item.sub && (
            <div className="text-xs text-slate-500 mt-0.5">{item.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
