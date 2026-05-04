"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SectionRenderer } from "@/components/report/SectionRenderer";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
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
  const [liveText, setLiveText] = useState("");
  const [currentSection, setCurrentSection] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [lawName, setLawName] = useState("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const stored = sessionStorage.getItem("analyzeRequest");
    if (!stored) {
      router.replace(`/analyze/${lawId}`);
      return;
    }

    let req: AnalyzeRequest;
    try {
      req = JSON.parse(stored);
    } catch {
      router.replace(`/analyze/${lawId}`);
      return;
    }

    setLawName(req.lawName);

    async function startStream() {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        setError("분석 요청에 실패했습니다.");
        return;
      }

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
              const sectionConfig = req.sections.find(
                (s) => s.id === event.sectionId
              );
              setCurrentSection(sectionConfig?.label ?? event.sectionId ?? "");
              setLiveText("");
            } else if (event.type === "chunk") {
              setLiveText((prev) => prev + (event.text ?? ""));
            } else if (event.type === "section_end" && event.sectionId) {
              const sectionConfig = req.sections.find(
                (s) => s.id === event.sectionId
              );
              setSections((prev) => [
                ...prev,
                {
                  sectionId: event.sectionId!,
                  label: sectionConfig?.label ?? event.sectionId!,
                  blocks: event.blocks ?? [],
                },
              ]);
              setLiveText("");
              setCurrentSection("");
            } else if (event.type === "done") {
              setDone(true);
              setLiveText("");
              setCurrentSection("");
              sessionStorage.removeItem("analyzeRequest");
            } else if (event.type === "error") {
              setError(event.message ?? "오류가 발생했습니다.");
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    }

    startStream().catch((e) => {
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
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" />
              인쇄 / 저장
            </Button>
          )}
        </div>

        {/* Report Header */}
        <div className="mb-8">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">
            법령 분석 보고서
          </p>
          <h1 className="text-3xl font-bold text-slate-900">{lawName}</h1>
          {!done && (
            <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              {currentSection ? `"${currentSection}" 분석 중...` : "분석 준비 중..."}
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

              {/* Live stream preview */}
              {!done && liveText && (
                <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">
                      {currentSection} 작성 중
                    </span>
                  </div>
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono max-h-40 overflow-hidden">
                    {liveText.slice(-800)}
                  </pre>
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
