import { formatDate } from "@/lib/utils";
import type { TimelineBlock as TimelineBlockType } from "@/lib/types";

export function TimelineBlock({ block }: { block: TimelineBlockType }) {
  return (
    <div className="relative pl-8 space-y-6">
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-blue-200" />
      {block.items.map((item, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-5 top-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white shadow" />
          <div className="text-xs text-blue-600 font-mono font-medium">
            {formatDate(item.date) || item.date}
          </div>
          <div className="text-sm text-slate-700 font-medium mt-0.5">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
