import { NextRequest, NextResponse } from "next/server";
import { searchLaws, LawApiAuthError } from "@/lib/law-api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
  }

  const page = Number(searchParams.get("page") ?? "1");
  const display = Number(searchParams.get("display") ?? "20");

  try {
    const result = await searchLaws(q, page, display);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LawApiAuthError) {
      return NextResponse.json(
        { error: err.message, code: "LAW_API_AUTH" },
        { status: 502 }
      );
    }
    console.error("law search error:", err);
    return NextResponse.json({ error: "법령 검색에 실패했습니다." }, { status: 500 });
  }
}
