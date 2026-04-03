import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm font-medium text-slate-200">Manual prompt</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        disabled={disabled}
        className="h-20 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white shadow-inner outline-none ring-1 ring-transparent transition focus:ring-cyan-400/60 disabled:opacity-50"
        placeholder="Ask JARVIS anything… (Enter to send)"
        aria-label="Manual prompt input"
      />
      <Button type="submit" disabled={disabled || !value.trim()} className="w-full">
        Send to JARVIS
      </Button>
    </form>
  );
}
