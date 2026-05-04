import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { SearchBar } from "@/components/search/SearchBar";
import { LawCard } from "@/components/search/LawCard";
import { Scale, Search } from "lucide-react";

interface SearchPageProps {
  searchParams: { q?: string; page?: string };
}

async function SearchResults({ q, page }: { q: string; page: number }) {
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const res = await fetch(
    `${baseUrl}/api/law/search?q=${encodeURIComponent(q)}&page=${page}&display=20`,
    { cache: "no-store" }
  );

  const data = await res.json();

  if (!res.ok) {
    if (data?.code === "LAW_API_AUTH") {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h3 className="font-semibold text-amber-900 mb-2">law.go.kr API 인증 실패</h3>
          <p className="text-sm text-amber-800 mb-3">
            현재 서버 IP가 law.go.kr API에 등록되어 있지 않습니다. 검색 기능을 사용하려면 IP 등록이 필요합니다.
          </p>
          <ol className="text-sm text-amber-800 list-decimal pl-5 space-y-1">
            <li><a href="https://www.law.go.kr" target="_blank" rel="noreferrer" className="underline">law.go.kr</a> 에 로그인</li>
            <li>마이페이지 → API 인증값 관리 메뉴로 이동</li>
            <li>현재 사용 중인 공인 IP를 등록</li>
            <li>변경 적용까지 약 5~10분 소요</li>
          </ol>
        </div>
      );
    }
    return (
      <div className="text-center py-12 text-slate-500">
        <p>검색 중 오류가 발생했습니다. {data?.error ?? ""}</p>
      </div>
    );
  }

  const { total, results } = data;

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Search className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <p className="font-medium">검색 결과가 없습니다.</p>
        <p className="text-sm mt-1">다른 키워드로 검색해보세요.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        총 <strong className="text-slate-700">{total.toLocaleString()}</strong>건의 법령이 검색되었습니다.
      </p>
      <div className="space-y-3">
        {results.map((law: Parameters<typeof LawCard>[0]["law"]) => (
          <LawCard key={law.id} law={law} />
        ))}
      </div>
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = searchParams;
  const q = params.q ?? "";
  const page = Number(params.page ?? "1");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">
        {!q ? (
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <Scale className="h-14 w-14 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              actlysis
            </h1>
            <p className="text-slate-500 mb-8">
              법령을 검색하고 AI 분석 보고서를 생성하세요
            </p>
            <div className="flex justify-center">
              <SearchBar />
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {["개인정보보호법", "근로기준법", "공정거래법", "건설산업기본법", "해상풍력발전 보급 촉진 특별법"].map((keyword) => (
                <a
                  key={keyword}
                  href={`/search?q=${encodeURIComponent(keyword)}`}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {keyword}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <SearchBar initialQuery={q} />
            </div>
            <Suspense
              fallback={
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-lg bg-slate-200 animate-pulse" />
                  ))}
                </div>
              }
            >
              <SearchResults q={q} page={page} />
            </Suspense>
          </>
        )}
      </main>
    </div>
  );
}
