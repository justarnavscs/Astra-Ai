interface TranscriptDisplayProps {
  wakeWordDetected: boolean;
  transcript: string;
}

export function TranscriptDisplay({ wakeWordDetected, transcript }: TranscriptDisplayProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/30 p-4 shadow-inner">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">You</p>
      <p className="mt-1 min-h-12 text-base font-semibold text-white">
        {wakeWordDetected
          ? transcript || "Listening for your command…"
          : 'Say "Jarvis" to wake'}
      </p>
    </div>
  );
}
