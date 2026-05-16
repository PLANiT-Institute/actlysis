"use client";

import { useState } from "react";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProviderManager } from "./ProviderManager";

/**
 * A header button that toggles a floating panel for managing custom AI providers.
 *
 * Clicking the gear icon opens an overlay panel containing ProviderManager.
 * Clicking again (or the X button inside the panel) closes it.
 */
export function ProviderManagerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="AI 프로바이더 설정"
        aria-expanded={open}
      >
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">AI 설정</span>
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Panel */}
          <div className="fixed right-4 top-14 z-50 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold text-slate-800 text-sm">사용자 AI 프로바이더</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                aria-label="닫기"
              >
                <X />
              </Button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <ProviderManager />
            </div>
          </div>
        </>
      )}
    </>
  );
}
