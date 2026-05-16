import { spawn } from "child_process";
import { DEFAULT_SECTION_PROMPTS, BLOCK_SCHEMA } from "../constants";
import { parseBlocks } from "./parse-blocks";
import type { AnalyzeRequest, SectionConfig, Block } from "../types";

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

interface SectionResult {
  sectionId: string;
  blocks: Block[];
}

function runClaudeForSection(req: AnalyzeRequest, section: SectionConfig): Promise<SectionResult> {
  return new Promise((resolve, reject) => {
    const prompt = buildSectionPrompt(req, section);
    const claudePath = process.env.CLAUDE_BIN ?? "claude";
    const model = req.model;

    const proc = spawn(claudePath, ["-p", `--model=${model}`], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.stdin.write(prompt, "utf8");
    proc.stdin.end();

    let buffer = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => { buffer += chunk.toString("utf8"); });
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI exited ${code}: ${stderr}`));
        return;
      }

      resolve({ sectionId: section.id, blocks: parseBlocks(buffer) });
    });

    proc.on("error", (err) => reject(err));
  });
}

export function streamAnalysis(req: AnalyzeRequest): ReadableStream<Uint8Array> {
  const enabledSections = req.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

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
          runClaudeForSection(req, section)
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
