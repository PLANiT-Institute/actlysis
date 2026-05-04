import Link from "next/link";
import { Scale } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-800">
          <Scale className="h-5 w-5 text-blue-600" />
          <span className="text-lg">actlysis</span>
        </Link>
      </div>
    </header>
  );
}
