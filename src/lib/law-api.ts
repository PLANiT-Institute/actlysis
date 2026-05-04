import axios from "axios";
import xml2js from "xml2js";
import type {
  LawSearchResult,
  LawContent,
  LawArticle,
  PrecedentResult,
} from "./types";

const OC = process.env.LAW_OC_KEY;
const BASE_URL = "http://www.law.go.kr/DRF";

export class LawApiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LawApiAuthError";
  }
}

// xml2js with attributes returns { _: "text", $: { attr } } — extract text only
function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj._ === "string") return obj._;
    // some elements come back as { something: "..." } when only one child
    return "";
  }
  return "";
}

function get(obj: Record<string, unknown> | null | undefined, key: string): string {
  if (!obj) return "";
  return asText(obj[key]);
}

async function lawRequest(
  endpoint: string,
  params: Record<string, string | number>
): Promise<Record<string, unknown>> {
  const response = await axios.get(`${BASE_URL}/${endpoint}`, {
    params: { OC, type: "XML", ...params },
    responseType: "text",
    timeout: 15000,
  });
  const text = response.data as string;

  const parsed = (await xml2js.parseStringPromise(text, {
    explicitArray: false,
    trim: true,
  })) as Record<string, unknown>;

  // Detect law.go.kr authentication failure
  const errResp = parsed?.Response as Record<string, string> | undefined;
  if (errResp?.result && String(errResp.result).includes("사용자 정보 검증에 실패")) {
    throw new LawApiAuthError(
      `law.go.kr API 인증 실패: 현재 서버 IP가 등록되어 있지 않습니다. ${errResp.msg ?? ""}`
    );
  }

  return parsed;
}

export async function searchLaws(
  query: string,
  page = 1,
  display = 20
): Promise<{ total: number; results: LawSearchResult[] }> {
  const data = await lawRequest("lawSearch.do", {
    target: "law",
    query,
    display,
    page,
  });

  const root = (data?.LawSearch ?? {}) as Record<string, unknown>;
  const items = root?.["law"] as unknown;
  if (!items) return { total: 0, results: [] };

  const laws = Array.isArray(items) ? items : [items];
  const total = Number(asText(root?.["totalCnt"]) || 0);

  const results: LawSearchResult[] = laws.map(
    (law: Record<string, unknown>) => ({
      id: get(law, "법령일련번호"),
      name: get(law, "법령명한글"),
      ministry: get(law, "소관부처명"),
      type: get(law, "법령구분명"),
      promulgatedAt: get(law, "공포일자"),
      effectiveAt: get(law, "시행일자"),
    })
  );

  return { total, results };
}

export async function getLawContent(lawId: string): Promise<LawContent | null> {
  const data = await lawRequest("lawService.do", {
    target: "law",
    MST: lawId,
  });

  const law = (data?.["법령"] ?? {}) as Record<string, unknown>;
  if (!law) return null;

  const info = (law["기본정보"] ?? {}) as Record<string, unknown>;
  const articlesRaw = (
    (law["조문"] as Record<string, unknown>)?.["조문단위"] ?? []
  ) as unknown;

  const articleList: LawArticle[] = [];
  const rawLines: string[] = [];

  if (articlesRaw) {
    const arr = Array.isArray(articlesRaw) ? articlesRaw : [articlesRaw];
    for (const art of arr as Record<string, unknown>[]) {
      const num = get(art, "조문번호");
      const title = get(art, "조문제목");
      const content = get(art, "조문내용");
      articleList.push({ number: num, title, content });
      if (title) rawLines.push(`제${num}조 ${title}`);
      if (content) rawLines.push(content.trim());
    }
  }

  // ministry can appear as object with attributes
  let ministryStr = get(info, "소관부처");
  if (!ministryStr) {
    const m = info["소관부처"];
    if (m && typeof m === "object") ministryStr = asText(m);
  }

  return {
    id: lawId,
    name:
      get(info, "법령명_한글") ||
      get(info, "법령명한글") ||
      get(info, "법령명"),
    ministry: ministryStr,
    promulgatedAt: get(info, "공포일자"),
    effectiveAt: get(info, "시행일자"),
    articleCount: articleList.length,
    articles: articleList,
    rawText: rawLines.join("\n"),
  };
}

export async function searchPrecedents(
  query: string,
  display = 10
): Promise<PrecedentResult[]> {
  const data = await lawRequest("lawSearch.do", {
    target: "prec",
    query,
    display,
    page: 1,
  });

  const root = (data?.PrecSearch ?? {}) as Record<string, unknown>;
  const items = root?.["prec"] as unknown;
  if (!items) return [];

  const precs = Array.isArray(items) ? items : [items];
  return precs.map((p: Record<string, unknown>) => ({
    id: get(p, "판례일련번호"),
    caseName: get(p, "사건명"),
    court: get(p, "법원명"),
    caseNumber: get(p, "사건번호"),
    decidedAt: get(p, "선고일자"),
  }));
}
