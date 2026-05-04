import { NextRequest, NextResponse } from "next/server";
import { searchPrecedents } from "@/lib/law-api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 });
  }

  const display = Number(searchParams.get("display") ?? "10");

  try {
    const results = await searchPrecedents(q, display);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("precedents error:", err);
    return NextResponse.json({ results: [] });
  }
}
