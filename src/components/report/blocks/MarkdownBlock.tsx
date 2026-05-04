"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MarkdownBlock as MarkdownBlockType } from "@/lib/types";

export function MarkdownBlock({ block }: { block: MarkdownBlockType }) {
  return (
    <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-h2:text-lg prose-h3:text-base prose-p:text-sm prose-li:text-sm prose-table:text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {block.content}
      </ReactMarkdown>
    </div>
  );
}
