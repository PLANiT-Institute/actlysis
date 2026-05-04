import { NextRequest, NextResponse } from "next/server";
import { streamAnalysisViaCLI } from "@/lib/claude-cli";
import type { AnalyzeRequest } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.lawContent || !body.sections) {
    return NextResponse.json({ error: "법령 데이터와 섹션 설정이 필요합니다." }, { status: 400 });
  }

  const stream = streamAnalysisViaCLI(body);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
