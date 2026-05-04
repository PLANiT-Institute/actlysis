"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SectionConfigPanel } from "@/components/analyze/SectionConfigPanel";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { LawContent, SectionConfig } from "@/lib/types";

interface AnalyzePageProps {
  params: { lawId: string };
}

export default function AnalyzePage({ params }: AnalyzePageProps) {
  const { lawId } = params;
  const router = useRouter();
  const [lawContent, setLawContent] = useState<LawContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetch(`/api/law/content?id=${lawId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setLawContent(data);
      })
      .catch(() => setError("법령 조회에 실패했습니다."))
      .finally(() => setLoading(false));
  }, [lawId]);

  async function handleGenerate(sections: SectionConfig[]) {
    if (!lawContent) return;
    setIsGenerating(true);

    try {
      // Fetch precedents for this law
      const precRes = await fetch(
        `/api/law/precedents?q=${encodeURIComponent(lawContent.name)}&display=10`
      );
      const precData = await precRes.json();
      const precedents = precData.results ?? [];

      // Store config in sessionStorage for the report page
      const analyzeRequest = {
        lawId,
        lawName: lawContent.name,
        lawContent,
        precedents,
        sections,
      };
      sessionStorage.setItem("analyzeRequest", JSON.stringify(analyzeRequest));

      router.push(`/report/${lawId}`);
    } catch {
      setIsGenerating(false);
      alert("분석 준비 중 오류가 발생했습니다.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-32 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-64 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !lawContent) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 text-center text-slate-500">
          <p>{error || "법령을 찾을 수 없습니다."}</p>
          <Link href="/search" className="text-blue-600 underline text-sm mt-2 inline-block">
            검색으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        <Link
          href="/search"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          검색으로 돌아가기
        </Link>

        {/* Law Info Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <FileText className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">
                {lawContent.name}
              </h1>
              <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {lawContent.ministry || "소관부처 미상"}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  시행일 {formatDate(lawContent.effectiveAt) || "-"}
                </span>
                <Badge variant="outline" className="text-xs">
                  총 {lawContent.articleCount}개 조문
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Section Config */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <SectionConfigPanel
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        </div>
      </main>
    </div>
  );
}
