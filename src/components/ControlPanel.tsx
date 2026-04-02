import { Button } from "@/components/ui/button";

interface ControlPanelProps {
  isActive: boolean;
  wakeWordEnabled: boolean;
  useSearch: boolean;
  onToggleActive: () => void;
  onToggleWakeWord: (enabled: boolean) => void;
  onToggleSearch: (enabled: boolean) => void;
  onReset: () => void;
}

export function ControlPanel({
  isActive,
  wakeWordEnabled,
  useSearch,
  onToggleActive,
  onToggleWakeWord,
  onToggleSearch,
  onReset,
}: ControlPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant={isActive ? "primary" : "secondary"}
        size="sm"
        onClick={onToggleActive}
        aria-pressed={isActive}
      >
        {isActive ? "● ONLINE" : "○ OFFLINE"}
      </Button>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10 text-white">
        <input
          type="checkbox"
          className="accent-cyan-400"
          checked={wakeWordEnabled}
          onChange={(e) => onToggleWakeWord(e.target.checked)}
          aria-label="Wake word detection"
        />
        Wake word
      </label>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10 text-white">
        <input
          type="checkbox"
          className="accent-cyan-400"
          checked={useSearch}
          onChange={(e) => onToggleSearch(e.target.checked)}
          aria-label="Web search"
        />
        Web search
      </label>

      <Button variant="ghost" size="sm" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}
