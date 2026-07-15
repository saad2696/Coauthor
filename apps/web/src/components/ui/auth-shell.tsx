import { FileText, Share2, Sparkles } from "lucide-react";

import { BrandMark } from "@/components/ui/brand-mark";
import { EditorPreview } from "@/components/ui/editor-preview";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left: dark branded panel (desktop only) */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-neutral-950 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5 blur-3xl"
          aria-hidden
        />

        {/* Ambient animated rings */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <span className="auth-ripple" />
          <span className="auth-ripple" style={{ animationDelay: "2s" }} />
          <span className="auth-ripple" style={{ animationDelay: "4s" }} />
          <div className="auth-orbit absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07]">
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />
          </div>
        </div>

        <div className="relative flex items-center gap-2.5">
          <BrandMark size={34} inverted />
          <span className="text-lg font-semibold tracking-tight">Coauthor</span>
        </div>

        <div className="relative flex flex-1 flex-col justify-center gap-8 py-10">
          <div className="max-w-md">
            <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight">
              Write together.
              <br />
              <span className="text-white/60">Share in a click.</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-400">
              A clean, collaborative document editor — rich text, autosave, and
              role-based sharing.
            </p>
          </div>

          <EditorPreview />

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-400">
            <InlineFeature icon={<FileText size={13} />} text="Autosave" />
            <InlineFeature icon={<Share2 size={13} />} text="Viewer / editor sharing" />
            <InlineFeature icon={<Sparkles size={13} />} text="Markdown import" />
          </div>
        </div>

        <p className="relative text-xs text-neutral-500">© 2026 Coauthor</p>
      </aside>

      {/* Right: form */}
      <main className="flex flex-1 items-center justify-center bg-neutral-50 px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <span className="lg:hidden">
              <BrandMark size={40} className="text-neutral-900" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              {title}
            </h1>
            <p className="text-sm text-neutral-500">{subtitle}</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function InlineFeature({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-white/70">{icon}</span>
      {text}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      {children}
    </label>
  );
}

export function SubmitButton({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-1 rounded-lg bg-neutral-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 disabled:opacity-50"
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}
