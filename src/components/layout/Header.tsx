import Link from "next/link";
import { Scale, Settings } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-800">
          <Scale className="h-5 w-5 text-blue-600" />
          <span className="text-lg">actlysis</span>
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">설정</span>
        </Link>
      </div>
    </header>
  );
}
