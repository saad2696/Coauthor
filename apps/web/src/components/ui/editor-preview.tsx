import { Bold, Italic, List, Underline } from "lucide-react";

/** A stylized, animated mock of the collaborative editor — the hero visual on
 * the dark auth panel. Monochrome (light-on-dark), decorative only. */
export function EditorPreview() {
  return (
    <div className="relative w-full max-w-sm">
      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-black/40 backdrop-blur">
        {/* window chrome */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          </div>
          <div className="flex -space-x-1.5">
            <Avatar>A</Avatar>
            <Avatar dim>B</Avatar>
          </div>
        </div>

        {/* toolbar */}
        <div className="mb-4 flex gap-1.5 border-b border-white/10 pb-3">
          {[Bold, Italic, Underline, List].map((Icon, i) => (
            <span
              key={i}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-white/40"
            >
              <Icon size={12} />
            </span>
          ))}
        </div>

        {/* document body */}
        <div className="space-y-2.5">
          <div className="h-3.5 w-2/3 rounded bg-white/30" />
          <div className="h-2 w-full rounded bg-white/10" />
          <div className="h-2 w-11/12 rounded bg-white/10" />
          <div className="flex items-center gap-1">
            <div className="h-2 w-1/2 rounded bg-white/10" />
            <span className="auth-blink h-3.5 w-0.5 rounded-full bg-white/80" />
          </div>
          <div className="h-2 w-5/6 rounded bg-white/10" />
          <div className="h-2 w-3/4 rounded bg-white/10" />
        </div>
      </div>

      {/* collaborator cursor flag */}
      <div className="auth-float absolute -right-3 top-24 flex items-center gap-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="drop-shadow">
          <path d="M5 3l14 8-6 1.5L9 20 5 3z" />
        </svg>
        <span className="rounded-md bg-white px-1.5 py-0.5 text-[9px] font-semibold text-neutral-900">
          Bob
        </span>
      </div>
    </div>
  );
}

function Avatar({
  children,
  dim = false,
}: {
  children: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-neutral-950 text-[10px] font-semibold ${
        dim ? "bg-white/25 text-white" : "bg-white text-neutral-900"
      }`}
    >
      {children}
    </span>
  );
}
