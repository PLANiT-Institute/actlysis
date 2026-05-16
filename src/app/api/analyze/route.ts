import { NextRequest, NextResponse } from "next/server";
import { streamAnalysis } from "@/lib/providers";
import type { AnalyzeRequest } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.lawContent || !body.sections || !body.model || !body.providerConfig) {
    return NextResponse.json(
      { error: "법령 데이터, 섹션, 프로바이더, 모델이 필요합니다." },
      { status: 400 }
    );
  }

  const stream = streamAnalysis(body);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
