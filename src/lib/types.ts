export interface LawSearchResult {
  id: string;
  name: string;
  ministry: string;
  type: string;
  promulgatedAt: string;
  effectiveAt: string;
}

export interface LawArticle {
  number: string;
  title: string;
  content: string;
}

export interface LawContent {
  id: string;
  name: string;
  ministry: string;
  promulgatedAt: string;
  effectiveAt: string;
  articleCount: number;
  articles: LawArticle[];
  rawText: string;
}

export interface PrecedentResult {
  id: string;
  caseName: string;
  court: string;
  caseNumber: string;
  decidedAt: string;
  summary?: string;
}

export interface SectionConfig {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
  customPrompt?: string;
}

// Block types for Claude output
export interface MarkdownBlock {
  type: "markdown";
  content: string;
}

export interface StatsItem {
  label: string;
  value: string;
  sub?: string;
}

export interface StatsBlock {
  type: "stats";
  items: StatsItem[];
}

export interface ComparisonTableBlock {
  type: "comparison_table";
  headers: string[];
  rows: string[][];
}

export interface MermaidBlock {
  type: "mermaid";
  diagramType: string;
  code: string;
}

export interface TimelineItem {
  date: string;
  label: string;
}

export interface TimelineBlock {
  type: "timeline";
  items: TimelineItem[];
}

export interface PenaltyRow {
  article: string;
  violation: string;
  penalty: string;
}

export interface PenaltyTableBlock {
  type: "penalty_table";
  rows: PenaltyRow[];
}

export type Block =
  | MarkdownBlock
  | StatsBlock
  | ComparisonTableBlock
  | MermaidBlock
  | TimelineBlock
  | PenaltyTableBlock;

export interface AnalysisSection {
  sectionId: string;
  label: string;
  blocks: Block[];
}

export interface AnalyzeRequest {
  lawId: string;
  lawName: string;
  lawContent: LawContent;
  precedents: PrecedentResult[];
  sections: SectionConfig[];
  model: string;
}

export interface SSEEvent {
  type: "section_start" | "chunk" | "section_end" | "done" | "error";
  sectionId?: string;
  text?: string;
  blocks?: Block[];
  message?: string;
}
