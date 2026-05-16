import type { AnalyzeRequest, SectionConfig, Block, ProviderConfig } from "../types";
import { parseBlocks } from "./parse-blocks";
import { buildSectionPrompt } from "./prompt";

interface SectionResult {
  sectionId: string;
  blocks: Block[];
}

interface OpenAIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

async function runSectionViaOpenAI(
  req: AnalyzeRequest,
  section: SectionConfig,
  config: ProviderConfig
): Promise<SectionResult> {
  const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
  const prompt = buildSectionPrompt(req, section);

  const messages: OpenAIMessage[] = [{ role: "user", content: prompt }];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey ?? ""}`,
    },
    body: JSON.stringify({
      model: req.model,
      messages,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI-compatible API 오류 (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as OpenAIChatResponse;

  if (data.error?.message) {
    throw new Error(`OpenAI-compatible API: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content ?? "";
  return { sectionId: section.id, blocks: parseBlocks(content) };
}

/**
 * Streams law analysis results from any OpenAI-compatible HTTP endpoint.
 *
 * All enabled sections are dispatched in parallel (one HTTP request each).
 * Results are streamed back as SSE events: section_start for all sections
 * up front, then section_end as each finishes, followed by a final done event.
 *
 * Args:
 *   req: Analyze request including providerConfig with baseUrl and apiKey.
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
          runSectionViaOpenAI(req, section, config)
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
