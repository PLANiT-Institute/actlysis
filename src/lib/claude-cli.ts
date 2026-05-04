import { spawn } from "child_process";
import { MODEL_ID, DEFAULT_SECTION_PROMPTS, BLOCK_SCHEMA } from "./constants";
import type { AnalyzeRequest, SectionConfig } from "./types";

function buildSystemPrompt(): string {
  return `당신은 대한민국 법률 전문 분석가입니다. 주어진 법령 본문과 판례 데이터를 바탕으로 구조화된 법령 분석 보고서를 생성합니다.

출력 형식 규칙:
1. 각 섹션은 반드시 ---SECTION_START:{sectionId}--- 로 시작하고 ---SECTION_END:{sectionId}--- 로 끝납니다.
2. 섹션 첫 번째 줄에 blocks JSON 배열을 출력하고 (한 줄에 압축된 JSON), 이어서 섹션 내용을 마크다운으로 작성합니다.
3. blocks JSON은 반드시 유효한 JSON이어야 합니다.
4. 마크다운 본문은 한국어로 작성하며, 조문 인용 시 제X조 형식을 사용합니다.
5. 법률 실무자가 즉시 참고할 수 있도록 전문적이고 명확하게 작성합니다.

${BLOCK_SCHEMA}`;
}

function buildUserPrompt(req: AnalyzeRequest): string {
  const enabledSections = req.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const precedentSummary =
    req.precedents.length > 0
      ? req.precedents
          .slice(0, 5)
          .map(
            (p) =>
              `- ${p.caseName} (${p.court}, ${p.decidedAt}, ${p.caseNumber})`
          )
          .join("\n")
      : "관련 판례 데이터 없음";

  const sectionInstructions = enabledSections
    .map(
      (s: SectionConfig) =>
        `## 섹션: ${s.label} (ID: ${s.id})
${s.customPrompt ?? DEFAULT_SECTION_PROMPTS[s.id] ?? "이 섹션의 내용을 분석하고 정리하세요."}

이 섹션을 ---SECTION_START:${s.id}--- 와 ---SECTION_END:${s.id}--- 사이에 작성하세요.
섹션 첫 줄에 blocks JSON 배열을 출력하고 ({"blocks":[...]} 형식, 반드시 한 줄), 이어서 마크다운 본문을 작성하세요.`
    )
    .join("\n\n");

  const articleSample = req.lawContent.articles
    .slice(0, 30)
    .map((a) => `제${a.number}조 ${a.title}\n${a.content}`)
    .join("\n\n");

  return `# 분석 대상 법령
법령명: ${req.lawName}
법령ID: ${req.lawId}
총 조문: ${req.lawContent.articleCount}개
소관부처: ${req.lawContent.ministry}
공포일: ${req.lawContent.promulgatedAt}
시행일: ${req.lawContent.effectiveAt}

## 법령 주요 조문 (상위 30개)
${articleSample}

## 관련 판례 (${req.precedents.length}건)
${precedentSummary}

---

# 분석 섹션 요청

${sectionInstructions}`;
}

export function streamAnalysisViaCLI(req: AnalyzeRequest): ReadableStream<Uint8Array> {
  const system = buildSystemPrompt();
  const user = buildUserPrompt(req);
  const fullPrompt = `<system>\n${system}\n</system>\n\n${user}`;

  const encoder = new TextEncoder();

  function sendEvent(data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  return new ReadableStream({
    async start(controller) {
      const claudePath = process.env.CLAUDE_BIN ?? "claude";

      const proc = spawn(claudePath, ["-p", `--model=${MODEL_ID}`], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      proc.stdin.write(fullPrompt, "utf8");
      proc.stdin.end();

      let buffer = "";
      const sectionPattern = /---SECTION_START:([^-\n]+)---\n([\s\S]*?)---SECTION_END:\1---/g;
      const sentSectionIds = new Set<string>();

      proc.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf8");
        buffer += text;

        // Detect section start for live status
        const startMatches = [...buffer.matchAll(/---SECTION_START:([^-\n]+)---/g)];
        for (const m of startMatches) {
          const sectionId = m[1].trim();
          if (!sentSectionIds.has(`start:${sectionId}`)) {
            sentSectionIds.add(`start:${sectionId}`);
            controller.enqueue(
              sendEvent({ type: "section_start", sectionId })
            );
          }
        }

        // Send chunk for live display
        controller.enqueue(sendEvent({ type: "chunk", text }));

        // Extract complete sections
        sectionPattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = sectionPattern.exec(buffer)) !== null) {
          const sectionId = match[1].trim();
          if (sentSectionIds.has(`end:${sectionId}`)) continue;

          sentSectionIds.add(`end:${sectionId}`);
          const sectionContent = match[2];
          const lines = sectionContent.split("\n");

          // Parse first non-empty line as blocks JSON
          let blocks: unknown[] = [];
          let mdStart = 0;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("{") && line.includes('"blocks"')) {
              try {
                const parsed = JSON.parse(line);
                blocks = parsed.blocks ?? [];
                mdStart = i + 1;
              } catch {
                // treat as markdown
              }
              break;
            }
            if (line.length > 0) break;
          }

          const markdownContent = lines.slice(mdStart).join("\n").trim();
          if (markdownContent) {
            blocks = [...blocks, { type: "markdown", content: markdownContent }];
          }

          controller.enqueue(sendEvent({ type: "section_end", sectionId, blocks }));
        }
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        console.error("[claude cli stderr]", chunk.toString("utf8"));
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          controller.enqueue(
            sendEvent({ type: "error", message: `Claude CLI 종료 코드: ${code}` })
          );
        } else {
          // Process any remaining complete sections
          sectionPattern.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = sectionPattern.exec(buffer)) !== null) {
            const sectionId = match[1].trim();
            if (sentSectionIds.has(`end:${sectionId}`)) continue;
            sentSectionIds.add(`end:${sectionId}`);
            const sectionContent = match[2];
            const lines = sectionContent.split("\n");
            let blocks: unknown[] = [];
            let mdStart = 0;
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line.startsWith("{") && line.includes('"blocks"')) {
                try {
                  const parsed = JSON.parse(line);
                  blocks = parsed.blocks ?? [];
                  mdStart = i + 1;
                } catch { /* */ }
                break;
              }
              if (line.length > 0) break;
            }
            const markdownContent = lines.slice(mdStart).join("\n").trim();
            if (markdownContent) {
              blocks = [...blocks, { type: "markdown", content: markdownContent }];
            }
            controller.enqueue(sendEvent({ type: "section_end", sectionId, blocks }));
          }
          controller.enqueue(sendEvent({ type: "done" }));
        }
        controller.close();
      });

      proc.on("error", (err) => {
        controller.enqueue(
          sendEvent({ type: "error", message: `Claude CLI 실행 오류: ${err.message}` })
        );
        controller.close();
      });
    },
  });
}
