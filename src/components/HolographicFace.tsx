import clsx from "clsx";

type AssistantState = "idle" | "listening" | "processing" | "speaking";

const statePalette: Record<AssistantState, { ring: string; glow: string; label: string }> = {
  idle: {
    ring: "from-cyan-400/40 via-blue-400/25 to-indigo-500/30",
    glow: "shadow-cyan-500/40",
    label: "IDLE",
  },
  listening: {
    ring: "from-emerald-400/40 via-cyan-400/25 to-blue-500/30",
    glow: "shadow-emerald-400/60",
    label: "LISTENING",
  },
  processing: {
    ring: "from-amber-300/50 via-cyan-300/25 to-sky-500/25",
    glow: "shadow-amber-300/60",
    label: "THINKING",
  },
  speaking: {
    ring: "from-fuchsia-400/45 via-violet-400/25 to-cyan-400/30",
    glow: "shadow-fuchsia-400/60",
    label: "SPEAKING",
  },
};

export function HolographicFace({
  state,
  wakeWordDetected,
}: {
  state: AssistantState;
  wakeWordDetected: boolean;
}) {
  const palette = statePalette[state];

  return (
    <div className="relative isolate flex w-full max-w-xl items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/80 via-slate-900/40 to-slate-900/70 p-6 shadow-2xl">
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 blur-3xl transition-all duration-700",
          palette.glow,
          wakeWordDetected ? "opacity-80" : "opacity-40",
        )}
      >
        <div className="absolute inset-10 rounded-full bg-gradient-to-tr from-cyan-500/30 via-blue-500/30 to-indigo-500/30" />
      </div>
      <div className="relative aspect-square w-full max-w-sm">
        <div
          className={clsx(
            "absolute inset-3 animate-spin-slow rounded-full bg-gradient-to-r opacity-60 blur-2xl",
            palette.ring,
          )}
        />
        <div
          className={clsx(
            "absolute inset-8 animate-reverse-spin-slower rounded-full border border-cyan-200/10",
            wakeWordDetected ? "shadow-[0_0_0_12px_rgba(34,211,238,0.2)]" : "",
          )}
        />
        <div className="absolute inset-0 rounded-full bg-slate-900/80 backdrop-blur-xl" />
        <div className="absolute inset-12 flex items-center justify-center">
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-b from-slate-800/80 to-slate-900/90 shadow-inner ring-1 ring-white/10">
            <div className="relative h-28 w-28 rounded-full bg-slate-900/90 shadow-[0_0_32px_rgba(59,130,246,0.35)]">
              <div className="absolute inset-3 rounded-full bg-gradient-to-br from-cyan-400/30 via-indigo-400/20 to-fuchsia-400/25 blur-sm" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div
                      key={index}
                      className={clsx(
                        "h-1.5 w-3 rounded-sm bg-cyan-200/70 transition-all duration-300",
                        wakeWordDetected
                          ? "animate-waveform"
                          : state === "speaking"
                            ? "animate-waveform-slow"
                            : "opacity-60",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-10 bottom-4 rounded-full bg-white/5 px-4 py-2 text-center text-xs font-semibold tracking-[0.2em] text-cyan-100/80 ring-1 ring-white/10">
          {palette.label} {wakeWordDetected ? "• JARVIS" : ""}
        </div>
      </div>
    </div>
  );
}

export function StateBadge({
  label,
  active,
  tone = "cyan",
}: {
  label: string;
  active?: boolean;
  tone?: "cyan" | "fuchsia" | "amber";
}) {
  const toneClass =
    tone === "fuchsia"
      ? "bg-fuchsia-500/10 text-fuchsia-100 ring-fuchsia-400/40"
      : tone === "amber"
        ? "bg-amber-500/10 text-amber-100 ring-amber-400/40"
        : "bg-cyan-500/10 text-cyan-100 ring-cyan-400/40";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 transition-all duration-200",
        toneClass,
        active ? "shadow-[0_0_0_3px_rgba(34,211,238,0.2)]" : "opacity-60",
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", active ? "bg-current" : "bg-white/40")} />
      {label}
    </span>
  );
}
