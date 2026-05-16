import type { AnalyzeRequest, SectionConfig, Block, ProviderConfig } from "../types";
import { parseBlocks } from "./parse-blocks";
import { buildSectionPrompt } from "./prompt";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 4096;

interface SectionResult {
  sectionId: string;
  blocks: Block[];
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  error?: {
    type?: string;
    message?: string;
  };
}

async function runSectionViaAnthropic(
  req: AnalyzeRequest,
  section: SectionConfig,
  config: ProviderConfig
): Promise<SectionResult> {
  const prompt = buildSectionPrompt(req, section);

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey ?? "",
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Anthropic API 오류 (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as AnthropicResponse;

  if (data.error?.message) {
    throw new Error(`Anthropic API: ${data.error.message}`);
  }

  const textBlock = data.content?.find((b) => b.type === "text");
  const content = textBlock?.text ?? "";
  return { sectionId: section.id, blocks: parseBlocks(content) };
}

/**
 * Streams law analysis results from the Anthropic Messages API.
 *
 * All enabled sections are dispatched in parallel (one HTTP request each).
 * Results are streamed back as SSE events: section_start for all sections
 * up front, then section_end as each finishes, followed by a final done event.
 *
 * Args:
 *   req: Analyze request including providerConfig with apiKey for Anthropic.
 *
 * Returns:
 *   ReadableStream emitting SSE-formatted Uint8Array chunks.
 */
export function streamAnalysis(req: AnalyzeRequest): ReadableStream<Uint8Array> {
  const config = req.providerConfig;
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
          runSectionViaAnthropic(req, section, config)
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
