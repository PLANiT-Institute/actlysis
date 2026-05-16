"use client";

import { useEffect, useRef, useState } from "react";
import type { MermaidBlock } from "@/lib/types";

export function MermaidDiagram({ block }: { block: MermaidBlock }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          fontFamily: "var(--font-sans), sans-serif",
        });

        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg: rendered } = await mermaid.render(id, block.code);

        if (!cancelled) {
          setSvg(rendered);
        }
      } catch (e) {
        if (!cancelled) {
          setError("다이어그램을 렌더링할 수 없습니다.");
          console.warn("Mermaid render error:", e);
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [block.code]);

  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        {error}
        <pre className="mt-2 text-xs text-slate-400 overflow-x-auto">{block.code}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Strip any background <rect> that Mermaid injects with a dark fill
  const cleanSvg = svg.replace(
    /(<rect[^>]*\bid="[^"]*background[^"]*"[^>]*>|<rect[^>]*style="[^"]*fill:\s*(?:#[0-9a-f]{6}|rgba?\([^)]+\))[^"]*"[^/]*)(?:\s*<\/rect>)?/gi,
    ""
  ).replace(
    /<svg([^>]*)>/,
    (m, attrs) => `<svg${attrs} style="background:white;">`
  );

  return (
    <div
      ref={ref}
      className="rounded-lg border border-slate-200 bg-white p-4 overflow-x-auto flex justify-center [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: cleanSvg }}
    />
  );
}
