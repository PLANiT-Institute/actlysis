import { NextResponse } from "next/server";
import { listOllamaModels } from "@/lib/providers/ollama";

export async function GET() {
  try {
    const models = await listOllamaModels();
    return NextResponse.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ollama 연결 실패";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
