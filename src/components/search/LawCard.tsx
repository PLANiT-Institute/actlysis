import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Calendar, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { LawSearchResult } from "@/lib/types";

interface LawCardProps {
  law: LawSearchResult;
}

const TYPE_COLORS: Record<string, string> = {
  법률: "bg-blue-100 text-blue-700",
  시행령: "bg-green-100 text-green-700",
  시행규칙: "bg-purple-100 text-purple-700",
  규정: "bg-orange-100 text-orange-700",
};

export function LawCard({ law }: LawCardProps) {
  return (
    <Link href={`/analyze/${law.id}`}>
      <Card className="group cursor-pointer border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    TYPE_COLORS[law.type] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {law.type}
                </span>
              </div>
              <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                {law.name}
              </h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {law.ministry || "소관부처 미상"}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  시행일 {formatDate(law.effectiveAt) || "-"}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
