import type { AnalyzeRequest, SectionConfig, Block } from "./types";
import { DEFAULT_SECTION_PROMPTS, BLOCK_SCHEMA } from "./constants";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export async function listOllamaModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/tags`, { cache: "no-store" });
  if (!res.ok) throw new Error("Ollama에 연결할 수 없습니다.");
  const data = (await res.json()) as { models?: OllamaModel[] };
  return data.models ?? [];
}

function buildSectionPrompt(req: AnalyzeRequest, section: SectionConfig): string {
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

function parseBlocks(rawOutput: string): Block[] {
  const cleaned = rawOutput.replace(/---END---\s*$/m, "").trim();
  const lines = cleaned.split("\n");

  let blocks: Block[] = [];
  let mdStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("{") && line.includes('"blocks"')) {
      try {
        const parsed = JSON.parse(line) as { blocks?: Block[] };
        blocks = parsed.blocks ?? [];
        mdStart = i + 1;
        break;
      } catch {
        for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
          try {
            const candidate = lines.slice(i, j + 1).join("\n");
            const parsed = JSON.parse(candidate) as { blocks?: Block[] };
            blocks = parsed.blocks ?? [];
            mdStart = j + 1;
            i = j;
            break;
          } catch {
            /* continue */
          }
        }
        if (blocks.length > 0) break;
      }
    }
  }

  const markdownContent = lines.slice(mdStart).join("\n").trim();
  if (markdownContent) {
    blocks = [...blocks, { type: "markdown", content: markdownContent }];
  }

  return blocks;
}

interface SectionResult {
  sectionId: string;
  blocks: Block[];
}

async function runOllamaForSection(
  req: AnalyzeRequest,
  section: SectionConfig,
  model: string
): Promise<SectionResult> {
  const prompt = buildSectionPrompt(req, section);

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!res.ok) {
    throw new Error(`Ollama 오류 (${res.status}): ${res.statusText}`);
  }

  const data = (await res.json()) as { response?: string; error?: string };
  if (data.error) throw new Error(`Ollama: ${data.error}`);

  const blocks = parseBlocks(data.response ?? "");
  return { sectionId: section.id, blocks };
}

export function streamAnalysisViaOllama(req: AnalyzeRequest): ReadableStream<Uint8Array> {
  const enabledSections = req.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const model = req.model;
  const encoder = new TextEncoder();

  function sendEvent(data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  return new ReadableStream({
    async start(controller) {
      try {
        for (const section of enabledSections) {
          controller.enqueue(sendEvent({ type: "section_start", sectionId: section.id }));
        }

        const promises = enabledSections.map((section) =>
          runOllamaForSection(req, section, model)
            .then((result) => {
              controller.enqueue(
                sendEvent({ type: "section_end", sectionId: result.sectionId, blocks: result.blocks })
              );
              return result;
            })
            .catch((err: Error) => {
              controller.enqueue(
                sendEvent({
                  type: "section_end",
                  sectionId: section.id,
                  blocks: [{ type: "markdown", content: `> ⚠️ 오류: ${err.message}` }],
                })
              );
              return null;
            })
        );

        await Promise.all(promises);
        controller.enqueue(sendEvent({ type: "done" }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "분석 중 오류 발생";
        controller.enqueue(sendEvent({ type: "error", message }));
      } finally {
        controller.close();
      }
    },
  });
}
