import type { AnalyzeRequest } from "../types";
import { streamAnalysis as streamViaOllama } from "./ollama";
import { streamAnalysis as streamViaClaude } from "./claude-code";
import { streamAnalysis as streamViaOpenAI } from "./openai-compatible";
import { streamAnalysis as streamViaAnthropic } from "./anthropic-api";

export function streamAnalysis(req: AnalyzeRequest): ReadableStream<Uint8Array> {
  const { providerConfig } = req;
  switch (providerConfig.type) {
    case "claude-code":
      return streamViaClaude(req);
    case "openai-compatible":
      return streamViaOpenAI(req);
    case "anthropic":
      return streamViaAnthropic(req);
    case "ollama":
    default:
      return streamViaOllama(req);
  }
}
