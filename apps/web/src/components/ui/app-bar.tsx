"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { BrandMark } from "@/components/ui/brand-mark";

export function AppBar() {
  const { user, logout } = useAuth();
  const label = user?.displayName || user?.email || "";
  const initial = (label[0] ?? "?").toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-neutral-900">
          <BrandMark size={28} />
          <span className="text-[15px] font-semibold tracking-tight">
            Coauthor
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-xs font-medium text-white">
              {initial}
            </span>
            <span className="text-sm text-neutral-600">{label}</span>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
