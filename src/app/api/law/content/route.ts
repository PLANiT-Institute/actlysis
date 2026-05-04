import { NextRequest, NextResponse } from "next/server";
import { getLawContent } from "@/lib/law-api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "법령 ID가 필요합니다." }, { status: 400 });
  }

  try {
    const result = await getLawContent(id);
    if (!result) {
      return NextResponse.json({ error: "법령을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("law content error:", err);
    return NextResponse.json({ error: "법령 조회에 실패했습니다." }, { status: 500 });
  }
}
