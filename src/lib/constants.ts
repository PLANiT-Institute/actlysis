import type { SectionConfig } from "./types";

export const DEFAULT_OLLAMA_MODEL = "qwen2.5:3b";

export const LAW_BASE_URL = "http://www.law.go.kr/DRF";

export const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: "overview", label: "법령 개요", enabled: true, order: 0 },
  { id: "articles", label: "주요 조문 요약", enabled: true, order: 1 },
  { id: "precedents", label: "관련 판례", enabled: true, order: 2 },
  { id: "terms", label: "법률 용어 해설", enabled: true, order: 3 },
];

export const DEFAULT_SECTION_PROMPTS: Record<string, string> = {
  overview:
    "법령의 제정 목적, 적용 범위, 핵심 구조(장/조 수)를 개요로 정리하세요. stats 블록으로 핵심 수치를 강조하고, mermaid 다이어그램으로 거버넌스 구조나 주요 관계도를 시각화하세요.",
  articles:
    "핵심 조문 5~10개를 선별하여 요약하세요. comparison_table로 개정 전후 비교 또는 항목별 정리를 제공하고, 절차가 있는 경우 flowchart로 표현하세요.",
  precedents:
    "주요 판례 3~5건을 분석하세요. 판시사항, 판결요지, 실무적 시사점을 포함하고, timeline 블록으로 주요 판례 연표를 정리하세요.",
  terms:
    "법령에 등장하는 주요 법률 용어의 법적 정의를 comparison_table 형태로 정리하세요. 조문 근거도 함께 표시하세요.",
};

export const BLOCK_SCHEMA = `
각 섹션의 blocks 배열에 포함 가능한 블록 타입:

1. 마크다운 텍스트
{ "type": "markdown", "content": "## 제목\n본문 내용..." }

2. 통계 카드 그리드
{ "type": "stats", "items": [{"label": "총 조문 수", "value": "51개", "sub": "9개 장"}] }

3. 비교 테이블
{ "type": "comparison_table", "headers": ["구분", "개정 전", "개정 후"], "rows": [["처리 근거", "동의", "동의+정당한이익"]] }

4. Mermaid 다이어그램 (flowchart TD, sequenceDiagram, erDiagram 등)
{ "type": "mermaid", "diagramType": "flowchart", "code": "flowchart TD\\n  A[시작] --> B{조건}" }

5. 타임라인
{ "type": "timeline", "items": [{"date": "2024-03-15", "label": "전면 개정 시행"}] }

6. 벌칙표
{ "type": "penalty_table", "rows": [{"article": "제71조", "violation": "목적 외 이용", "penalty": "5년 이하 징역"}] }
`;
