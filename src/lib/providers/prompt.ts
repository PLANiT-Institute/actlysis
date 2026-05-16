import type { AnalyzeRequest, SectionConfig } from "../types";
import { DEFAULT_SECTION_PROMPTS, BLOCK_SCHEMA } from "../constants";

/**
 * Builds the full prompt string for a single analysis section.
 *
 * Shared across all provider backends (Ollama, Claude Code, OpenAI-compatible,
 * Anthropic API) so the instruction format stays identical regardless of which
 * model handles the request.
 *
 * Args:
 *   req: The full analyze request (law content, precedents, section list, etc.)
 *   section: The specific section being generated.
 *
 * Returns:
 *   A UTF-8 prompt string ready to be sent as a user message.
 */
export function buildSectionPrompt(req: AnalyzeRequest, section: SectionConfig): string {
  const precedentSummary =
    req.precedents.length > 0
      ? req.precedents
          .slice(0, 5)
          .map((p) => `- ${p.caseName} (${p.court}, ${p.decidedAt}, ${p.caseNumber})`)
          .join("\n")
      : "관련 판례 데이터 없음";

  const articlesToInclude =
    section.id === "overview" ? 10 : section.id === "articles" ? 30 : 20;

  const articleSample = req.lawContent.articles
    .slice(0, articlesToInclude)
    .map((a) => `제${a.number}조 ${a.title}\n${a.content}`)
    .join("\n\n");

  const sectionPrompt =
    section.customPrompt ?? DEFAULT_SECTION_PROMPTS[section.id] ?? "이 섹션의 내용을 분석하고 정리하세요.";

  return `당신은 대한민국 법률 전문 분석가입니다. 아래 법령에 대한 "${section.label}" 섹션을 작성합니다.

# 출력 형식 (반드시 준수)
- 첫 줄: blocks JSON 배열 (한 줄, 압축된 JSON, 다른 텍스트 없이)
- 둘째 줄부터: 마크다운 본문
- 마지막에 ---END--- 표시

${BLOCK_SCHEMA}

# 분석 대상 법령
법령명: ${req.lawName}
소관부처: ${req.lawContent.ministry}
시행일: ${req.lawContent.effectiveAt}
총 조문 수: ${req.lawContent.articleCount}개

## 법령 본문 (상위 ${articlesToInclude}개 조문)
${articleSample}

## 관련 판례
${precedentSummary}

# 작성 지시
${sectionPrompt}

이제 위 형식에 따라 "${section.label}" 섹션을 작성하세요. 첫 줄에 {"blocks":[...]} JSON을 출력하고, 이어서 마크다운 본문을 쓰고, 마지막에 ---END--- 로 종료하세요.`;
}
