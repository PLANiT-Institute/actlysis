import type { AnalyzeRequest } from "../types";
import { streamAnalysis as streamViaClaude } from "./claude-code";
import { streamAnalysis as streamViaOllama } from "./ollama";

export function streamAnalysis(req: AnalyzeRequest): ReadableStream<Uint8Array> {
  return req.provider === "claude-code"
    ? streamViaClaude(req)
    : streamViaOllama(req);
}
