interface ResponseDisplayProps {
  response: string;
  searchLatencyMs: number | null;
}

export function ResponseDisplay({ response, searchLatencyMs }: ResponseDisplayProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/40 p-4 shadow-inner">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">JARVIS</p>
      <p className="mt-1 min-h-16 text-base leading-7 text-slate-100">
        {response || "Awaiting your command…"}
      </p>
      {searchLatencyMs !== null && (
        <p className="mt-2 text-[10px] text-slate-500">
          Search augmented · {Math.round(searchLatencyMs)}ms
        </p>
      )}
    </div>
  );
}
