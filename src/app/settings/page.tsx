"use client";

import { Header } from "@/components/layout/Header";
import { ProviderManager } from "@/components/settings/ProviderManager";
import { Bot, Info } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">설정</h1>
          <p className="text-sm text-slate-500 mt-1">AI 프로바이더를 추가하고 관리합니다.</p>
        </div>

        {/* AI Provider section */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-slate-800">AI 프로바이더</h2>
          </div>

          {/* Info box */}
          <div className="flex gap-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
            <div className="space-y-1">
              <p>
                <strong>Ollama</strong>와 <strong>Claude Code</strong>는 별도 설정 없이 자동으로 사용할 수 있습니다.
              </p>
              <p>
                OpenAI, Groq, Together AI, Anthropic API 등 외부 API를 사용하려면 아래에서 추가하세요.
                API 키는 이 기기의 브라우저 저장소(localStorage)에만 보관되며 외부로 전송되지 않습니다.
              </p>
            </div>
          </div>

          <ProviderManager />
        </section>

      </main>
    </div>
  );
}
