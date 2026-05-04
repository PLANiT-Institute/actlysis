import type { Block } from "@/lib/types";
import { MarkdownBlock } from "./blocks/MarkdownBlock";
import { StatsCard } from "./blocks/StatsCard";
import { ComparisonTable } from "./blocks/ComparisonTable";
import { MermaidDiagram } from "./blocks/MermaidDiagram";
import { TimelineBlock } from "./blocks/TimelineBlock";
import { PenaltyTable } from "./blocks/PenaltyTable";

export function SectionRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "markdown":
            return <MarkdownBlock key={i} block={block} />;
          case "stats":
            return <StatsCard key={i} block={block} />;
          case "comparison_table":
            return <ComparisonTable key={i} block={block} />;
          case "mermaid":
            return <MermaidDiagram key={i} block={block} />;
          case "timeline":
            return <TimelineBlock key={i} block={block} />;
          case "penalty_table":
            return <PenaltyTable key={i} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
