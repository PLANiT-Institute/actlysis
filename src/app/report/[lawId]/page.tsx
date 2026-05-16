"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SectionRenderer } from "@/components/report/SectionRenderer";
import { Printer, ArrowLeft, Loader2, TriangleAlert, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { AnalyzeRequest, AnalysisSection, SSEEvent } from "@/lib/types";

interface ReportPageProps {
  params: { lawId: string };
}

export default function ReportPage({ params }: ReportPageProps) {
  const { lawId } = params;
  const router = useRouter();
  const [sections, setSections] = useState<AnalysisSection[]>([]);
  const [pendingSections, setPendingSections] = useState<{ id: string; label: string }[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [lawName, setLawName] = useState("");
  const [modelLabel, setModelLabel] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const streamStarted = useRef(false);

  useEffect(() => {
    if (streamStarted.current) return;
    streamStarted.current = true;

    const stored = sessionStorage.getItem("analyzeRequest");
    if (!stored) { router.replace(`/analyze/${lawId}`); return; }

    let req: AnalyzeRequest;
    try { req = JSON.parse(stored); }
    catch { router.replace(`/analyze/${lawId}`); return; }

    setLawName(req.lawName);
    setModelLabel(`${req.providerConfig.name} · ${req.model}`);

    async function startStream() {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      if (!res.ok) { setError("분석 요청에 실패했습니다."); return; }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));

            if (event.type === "section_start") {
              const sectionConfig = req.sections.find((s) => s.id === event.sectionId);
              setPendingSections((prev) => [
                ...prev,
                { id: event.sectionId!, label: sectionConfig?.label ?? event.sectionId! },
              ]);
            } else if (event.type === "section_end" && event.sectionId) {
              const sectionConfig = req.sections.find((s) => s.id === event.sectionId);
              setSections((prev) => {
                const next = [...prev, {
                  sectionId: event.sectionId!,
                  label: sectionConfig?.label ?? event.sectionId!,
                  blocks: event.blocks ?? [],
                }];
                return next.sort((a, b) => {
                  const oa = req.sections.find((s) => s.id === a.sectionId)?.order ?? 0;
                  const ob = req.sections.find((s) => s.id === b.sectionId)?.order ?? 0;
                  return oa - ob;
                });
              });
              setPendingSections((prev) => prev.filter((p) => p.id !== event.sectionId));
            } else if (event.type === "done") {
              setDone(true);
              setPendingSections([]);
              setGeneratedAt(new Date().toLocaleString("ko-KR", {
                year: "numeric", month: "long", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              }));
              sessionStorage.removeItem("analyzeRequest");
            } else if (event.type === "error") {
              setError(event.message ?? "오류가 발생했습니다.");
            }
          } catch { /* ignore parse errors */ }
        }
      }
    }

    startStream().catch((e: Error) => {
      setError(e.message ?? "스트리밍 오류가 발생했습니다.");
    });
  }, [lawId, router]);

  return (
    <div className="min-h-screen flex flex-col print:bg-white">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link
            href={`/analyze/${lawId}`}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            설정으로 돌아가기
          </Link>
          {done && (
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />
              인쇄 / PDF 저장
            </Button>
          )}
        </div>

        {/* Report Header */}
        <div className="mb-8">
          {/* Print-only branding line */}
          <div className="hidden print:flex items-center gap-1.5 mb-4 text-slate-400 text-xs">
            <Scale className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-blue-600 font-semibold">Actlysis</span>
            <span>by PLANiT Institute · law.go.kr</span>
          </div>
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">
            법령 분석 보고서
          </p>
          <h1 className="text-3xl font-bold text-slate-900">{lawName}</h1>
          {!done && (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                {pendingSections.length > 0
                  ? `${pendingSections.length}개 섹션 동시 분석 중 (완료: ${sections.length}/${sections.length + pendingSections.length})`
                  : "분석 준비 중..."}
              </div>
              {pendingSections.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {pendingSections.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 border border-blue-100"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {p.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* TOC (sticky sidebar for large screens) */}
        {sections.length > 0 && (
          <div className="flex gap-8">
            <aside className="hidden lg:block w-48 flex-shrink-0">
              <div className="sticky top-24">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
                  목차
                </p>
                <nav className="space-y-1">
                  {sections.map((s) => (
                    <button
                      key={s.sectionId}
                      onClick={() =>
                        sectionRefs.current[s.sectionId]?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                      }
                      className="block w-full text-left text-sm text-slate-500 hover:text-blue-600 py-1 transition-colors truncate"
                    >
                      {s.label}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Sections */}
            <div className="flex-1 space-y-10">
              {sections.map((section) => (
                <section
                  key={section.sectionId}
                  ref={(el) => {
                    sectionRefs.current[section.sectionId] = el;
                  }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3 mb-6">
                    {section.label}
                  </h2>
                  <SectionRenderer blocks={section.blocks} />
                </section>
              ))}

              {/* Pending section placeholders */}
              {!done &&
                pendingSections.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm font-medium text-slate-600">
                        {p.label} 분석 중...
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse" />
                      <div className="h-3 w-full bg-slate-200 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}

              {/* AI Disclaimer — shown when all sections are done */}
              {done && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 space-y-3 print:border-slate-300 print:bg-white">
                  <div className="flex items-center gap-2 text-amber-700">
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                    <span className="font-semibold text-sm">AI 생성 보고서 — 법적 효력 없음</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed print:text-slate-600">
                    이 보고서는 <strong>Actlysis</strong>(PLANiT Institute)가 AI 모델을 이용해 자동 생성한 참고 자료입니다.
                    AI의 특성상 내용이 부정확하거나 누락·왜곡될 수 있으며, 법적 판단이나 의사결정의 근거로 단독 사용할 수 없습니다.
                    중요한 법적 사안은 반드시 자격을 갖춘 법률 전문가에게 확인하세요.
                    법령 원문은 <a href="https://www.law.go.kr" target="_blank" rel="noreferrer" className="underline">law.go.kr</a>에서 확인할 수 있습니다.
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-amber-700 print:text-slate-500 pt-1 border-t border-amber-200 print:border-slate-200">
                    <span className="flex items-center gap-1">
                      <Scale className="h-3 w-3" />
                      분석 대상: {lawName}
                    </span>
                    {modelLabel && <span>모델: {modelLabel}</span>}
                    {generatedAt && <span>생성 일시: {generatedAt}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!done && sections.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mb-4" />
            <p className="text-sm">법령을 분석하고 있습니다...</p>
          </div>
        )}
      </main>
    </div>
  );
}
