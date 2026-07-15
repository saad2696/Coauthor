import { FileText, Share2, Sparkles } from "lucide-react";

import { BrandMark } from "@/components/ui/brand-mark";

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

        {/* Animated monochrome graphic */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <span className="auth-ripple" />
          <span className="auth-ripple" style={{ animationDelay: "2s" }} />
          <span className="auth-ripple" style={{ animationDelay: "4s" }} />

          {/* Orbiting dot around the centre */}
          <div className="auth-orbit absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10">
            <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
          </div>

          {/* Floating "document" cards */}
          <div
            className="auth-float absolute right-20 top-24 h-16 w-28 rounded-lg border border-white/10 bg-white/[0.04]"
          />
          <div
            className="auth-float absolute left-16 bottom-32 h-12 w-24 rounded-lg border border-white/10 bg-white/[0.04]"
            style={{ animationDelay: "1.8s" }}
          />
        </div>

        <div className="relative flex items-center gap-2.5">
          <BrandMark size={34} inverted />
          <span className="text-lg font-semibold tracking-tight">Coauthor</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Write together.<br />Share in a click.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">
            A clean, collaborative document editor — rich text, autosave, and
            role-based sharing.
          </p>

          <ul className="mt-8 flex flex-col gap-4 text-sm">
            <Feature icon={<FileText size={16} />} text="Rich-text editor with autosave" />
            <Feature icon={<Share2 size={16} />} text="Share as viewer or editor" />
            <Feature icon={<Sparkles size={16} />} text="Import Markdown & text files" />
          </ul>
        </div>

        <p className="relative text-xs text-neutral-500">
          © {"2026"} Coauthor
        </p>
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

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3 text-neutral-300">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
        {icon}
      </span>
      {text}
    </li>
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
