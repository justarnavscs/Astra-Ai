"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HolographicFace, StateBadge } from "@/components/HolographicFace";

type AssistantState = "idle" | "listening" | "processing" | "speaking";

type Message = {
  role: "user" | "assistant";
  content: string;
  at: number;
};

type SearchResult = {
  title: string;
  link: string;
  snippet?: string;
};

const WAKE_WORDS = ["jarvis", "hey jarvis"];

function normalizeText(input: string) {
  return input.toLowerCase().trim();
}

function containsWakeWord(text: string) {
  const normalized = normalizeText(text);
  return WAKE_WORDS.some((word) => normalized.includes(word));
}

async function speakWithSynthesis(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 0.85;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

async function playAudioBlob(blob: Blob) {
  return new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    audio.play().catch(reject);
  });
}

export default function Home() {
  const [assistantState, setAssistantState] = useState<AssistantState>("idle");
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [manualPrompt, setManualPrompt] = useState("");
  const [useSearch, setUseSearch] = useState(true);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchLatencyMs, setSearchLatencyMs] = useState<number | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speakingRef = useRef(false);
  const hasMountedRef = useRef(false);
  const decoderRef = useRef<TextDecoder>(new TextDecoder("utf-8"));
  const wakeWordActiveRef = useRef(false);

  const isBrowserSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const anyWindow = window as typeof window & {
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
      SpeechRecognition?: SpeechRecognitionConstructor;
    };
    return Boolean(anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition);
  }, []);

  const fetchSearchResults = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      if (!useSearch) return [];
      try {
        const started = performance.now();
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const data = await res.json();
        const organic = (data?.organic_results as SearchResult[] | undefined) ?? [];
        const sanitized = organic.slice(0, 4).map((item) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
        }));
        setSearchLatencyMs(performance.now() - started);
        return sanitized;
      } catch (err) {
        console.warn("Search fallback to local context", err);
        setSearchLatencyMs(null);
        return [];
      }
    },
    [useSearch],
  );

  const streamAssistant = useCallback(
    async (prompt: string) => {
      const searchResults = await fetchSearchResults(prompt);
      setAssistantState("processing");
      decoderRef.current = new TextDecoder("utf-8");
      setResponse("");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, includeSearch: useSearch, searchResults }),
      });

      if (!res.ok || !res.body) {
        const message = await res.text();
        setError(message || "Unable to stream response");
        setAssistantState("idle");
        return "";
      }

      const reader = res.body.getReader();
      const decoder = decoderRef.current;
      let assembled = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assembled += decoder.decode(value, { stream: true });
        setResponse(assembled);
      }
      assembled += decoder.decode();
      setResponse(assembled);
      return assembled.trim();
    },
    [fetchSearchResults, useSearch],
  );

  const speak = useCallback(
    async (text: string) => {
      if (!text) return;
      speakingRef.current = true;
      setAssistantState("speaking");
      recognitionRef.current?.abort();

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (res.ok) {
          const blob = await res.blob();
          await playAudioBlob(blob);
          return;
        }
        await speakWithSynthesis(text);
      } catch (err) {
        console.warn("TTS fallback to SpeechSynthesis", err);
        await speakWithSynthesis(text);
      } finally {
        speakingRef.current = false;
        setAssistantState("idle");
        wakeWordActiveRef.current = false;
        setWakeWordDetected(false);
        if (wakeWordEnabled) {
          try {
            recognitionRef.current?.start();
          } catch {
            // ignore start errors when restarting the mic
          }
        }
      }
    },
    [wakeWordEnabled],
  );

  const handlePrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;

      wakeWordActiveRef.current = false;
      setWakeWordDetected(false);
      setMessages((prev) => [...prev, { role: "user", content: trimmed, at: Date.now() }]);
      const reply = await streamAssistant(trimmed);
      if (!reply) return;
      setMessages((prev) => [...prev, { role: "assistant", content: reply, at: Date.now() }]);
      await speak(reply);
    },
    [speak, streamAssistant],
  );

  const attachRecognition = useCallback(() => {
    if (!wakeWordEnabled || !isBrowserSupported) return;
    const anyWindow = window as typeof window & {
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
      SpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognitionCtor =
      anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setError("Web Speech API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let latestTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        latestTranscript += event.results[i][0].transcript;
      }
      if (!wakeWordActiveRef.current && containsWakeWord(latestTranscript)) {
        wakeWordActiveRef.current = true;
        setWakeWordDetected(true);
        setAssistantState("listening");
        setTranscript("");
        return;
      }

      if (!wakeWordActiveRef.current) return;
      setTranscript(latestTranscript.trim());

      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        wakeWordActiveRef.current = false;
        recognition.stop();
        setAssistantState("processing");
        handlePrompt(latestTranscript);
      }
    };

    recognition.onstart = () => setError(null);
    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      setError(event.error);
    };
    recognition.onend = () => {
      if (speakingRef.current || !wakeWordEnabled) return;
      try {
        recognition.start();
      } catch {
        // ignored to avoid recursive errors
      }
    };

    recognitionRef.current = recognition;
    wakeWordActiveRef.current = false;
    setWakeWordDetected(false);
    recognition.start();
  }, [handlePrompt, isBrowserSupported, wakeWordEnabled]);

  useEffect(() => {
    if (hasMountedRef.current) return undefined;
    hasMountedRef.current = true;

    if (!isBrowserSupported) {
      setError("Web Speech API unsupported. Use manual prompt instead.");
      return undefined;
    }

    attachRecognition();
    return () => {
      recognitionRef.current?.stop();
    };
  }, [attachRecognition, isBrowserSupported]);

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualPrompt.trim()) return;
    await handlePrompt(manualPrompt);
    setManualPrompt("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Astra AI</p>
              <h1 className="text-3xl font-semibold text-white md:text-4xl">
                JARVIS Holographic Assistant
              </h1>
              <p className="text-sm text-slate-300">
                Streaming GPT-4o-mini • Wake word detection • ElevenLabs with graceful fallback
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StateBadge label="Listening" active={assistantState === "listening"} />
              <StateBadge label="Thinking" tone="amber" active={assistantState === "processing"} />
              <StateBadge label="Speaking" tone="fuchsia" active={assistantState === "speaking"} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
              Wake words: &quot;Jarvis&quot;, &quot;Hey Jarvis&quot;
            </span>
            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
              Streaming latency optimized
            </span>
            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
              {useSearch ? "Web search enabled" : "Web search disabled"}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <HolographicFace state={assistantState} wakeWordDetected={wakeWordDetected} />

          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Realtime Voice Loop</p>
                <p className="text-xs text-slate-300">
                  Passive wake-word detection with safety guard against self-trigger loops.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-xs font-semibold ring-1 ring-white/10">
                <input
                  type="checkbox"
                  className="accent-cyan-400"
                  checked={wakeWordEnabled}
                  onChange={(e) => {
                    setWakeWordEnabled(e.target.checked);
                    if (!e.target.checked) {
                      recognitionRef.current?.abort();
                      wakeWordActiveRef.current = false;
                      setWakeWordDetected(false);
                      setAssistantState("idle");
                    } else {
                      attachRecognition();
                    }
                  }}
                />
                Auto listen
              </label>
            </div>

            {!isBrowserSupported && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                Browser speech APIs unavailable. Use manual text prompts below.
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {error}
              </div>
            )}

            <div className="rounded-2xl border border-white/5 bg-black/30 p-4 shadow-inner">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">User</p>
              <p className="min-h-14 text-lg font-semibold text-white">
                {wakeWordDetected ? transcript || "Listening for your command…" : 'Say "Jarvis"'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/40 p-4 shadow-inner">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Jarvis</p>
              <p className="min-h-20 text-lg leading-7 text-slate-100">
                {response || "Awaiting next request…"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <StateBadge label="Wake guard" active={!speakingRef.current} />
                <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                  Fallback: ElevenLabs → SpeechSynthesis
                </span>
                {searchLatencyMs !== null && (
                  <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                    Search {Math.round(searchLatencyMs)}ms
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <label className="flex items-center justify-between text-sm font-medium text-slate-200">
                Manual prompt
                <div className="flex items-center gap-2 text-xs">
                  <input
                    id="use-search"
                    type="checkbox"
                    className="accent-cyan-400"
                    checked={useSearch}
                    onChange={(e) => setUseSearch(e.target.checked)}
                  />
                  <span className="text-slate-300">Use web search</span>
                </div>
              </label>
              <textarea
                value={manualPrompt}
                onChange={(e) => setManualPrompt(e.target.value)}
                className="h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white shadow-inner outline-none ring-1 ring-transparent transition focus:ring-cyan-400/60"
                placeholder="Ask Jarvis anything…"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-cyan-400/50"
                >
                  Send to Jarvis
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTranscript("");
                    setResponse("");
                    wakeWordActiveRef.current = false;
                    setWakeWordDetected(false);
                    setAssistantState("idle");
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Recent context</p>
              <p className="text-xs text-slate-300">
                Jarvis keeps the last few exchanges to avoid stale closure issues.
              </p>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10">
              {messages.length} messages
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {messages.slice(-6).map((message) => (
              <div
                key={`${message.at}-${message.role}`}
                className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-inner"
                data-role={message.role}
              >
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
                  {message.role === "user" ? "User" : "Jarvis"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-100">{message.content}</p>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-300">
                Talk to Jarvis or use manual prompt to populate the timeline.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
