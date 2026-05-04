"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SectionConfigPanel } from "@/components/analyze/SectionConfigPanel";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, FileText, ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { DEFAULT_OLLAMA_MODEL } from "@/lib/constants";
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
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_OLLAMA_MODEL);
  const [ollamaError, setOllamaError] = useState("");

  useEffect(() => {
    fetch(`/api/law/content?id=${lawId}`)
      .then((r) => r.json())
      .then((data: { error?: string } & LawContent) => {
        if (data.error) setError(data.error);
        else setLawContent(data);
      })
      .catch(() => setError("법령 조회에 실패했습니다."))
      .finally(() => setLoading(false));

    fetch("/api/ollama/models")
      .then((r) => r.json())
      .then((data: { models?: { name: string }[]; error?: string }) => {
        if (data.error) {
          setOllamaError(data.error);
        } else {
          const names = (data.models ?? []).map((m) => m.name);
          setOllamaModels(names);
          if (names.length > 0 && !names.includes(selectedModel)) {
            setSelectedModel(names[0]);
          }
        }
      })
      .catch(() => setOllamaError("Ollama에 연결할 수 없습니다."));
  }, [lawId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        model: selectedModel,
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

        {/* Ollama Model Selector */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-slate-800">AI 모델 선택</h2>
          </div>
          {ollamaError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {ollamaError} — Ollama가 실행 중인지 확인하세요 (<code>ollama serve</code>)
            </div>
          ) : ollamaModels.length === 0 ? (
            <p className="text-sm text-slate-400">모델 목록 불러오는 중...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ollamaModels.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedModel(m)}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                    selectedModel === m
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
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
