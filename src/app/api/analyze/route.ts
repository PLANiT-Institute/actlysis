import { NextRequest, NextResponse } from "next/server";
import { streamAnalysisViaOllama } from "@/lib/ollama";
import type { AnalyzeRequest } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.lawContent || !body.sections || !body.model) {
    return NextResponse.json({ error: "법령 데이터, 섹션 설정, 모델이 필요합니다." }, { status: 400 });
  }

  const stream = streamAnalysisViaOllama(body);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
