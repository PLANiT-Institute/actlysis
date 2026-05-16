import { spawn } from "child_process";
import { parseBlocks } from "./parse-blocks";
import { buildSectionPrompt } from "./prompt";
import type { AnalyzeRequest, SectionConfig, Block } from "../types";

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
