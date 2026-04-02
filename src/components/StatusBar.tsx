import clsx from "clsx";
import type { AssistantStatus } from "@/types/jarvis";

const statusConfig: Record<
  AssistantStatus,
  { label: string; dot: string; bar: string }
> = {
  OFFLINE:  { label: "OFFLINE",    dot: "bg-slate-500",   bar: "bg-slate-700" },
  ONLINE:   { label: "ONLINE",     dot: "bg-cyan-400",    bar: "bg-cyan-900/60" },
  LISTENING:{ label: "LISTENING",  dot: "bg-emerald-400 animate-pulse", bar: "bg-emerald-900/60" },
  SPEAKING: { label: "SPEAKING",   dot: "bg-fuchsia-400 animate-pulse", bar: "bg-fuchsia-900/60" },
  PROCESSING:{ label: "PROCESSING",dot: "bg-amber-400 animate-spin",    bar: "bg-amber-900/60" },
  ERROR:    { label: "ERROR",      dot: "bg-rose-400",    bar: "bg-rose-900/60" },
};

interface StatusBarProps {
  status: AssistantStatus;
  errorMessage?: string | null;
}

export function StatusBar({ status, errorMessage }: StatusBarProps) {
  const cfg = statusConfig[status];

  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-300",
        cfg.bar,
      )}
      role="status"
      aria-live="polite"
    >
      <span className={clsx("h-2 w-2 flex-shrink-0 rounded-full", cfg.dot)} />
      <span className="text-white/80">{cfg.label}</span>
      {status === "ERROR" && errorMessage && (
        <span className="ml-1 truncate text-rose-200/70">&mdash; {errorMessage}</span>
      )}
    </div>
  );
}
