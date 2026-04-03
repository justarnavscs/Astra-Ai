"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HolographicFace, StateBadge } from "@/components/HolographicFace";
import { StatusBar } from "@/components/StatusBar";
import { ControlPanel } from "@/components/ControlPanel";
import { ChatInput } from "@/components/ChatInput";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import { ResponseDisplay } from "@/components/ResponseDisplay";
import { Card } from "@/components/ui/card";
import { useWakeWord } from "@/hooks/useWakeWord";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import type { AssistantStatus, Message } from "@/types/jarvis";

const MAX_HISTORY = 50;

export default function Home() {
  const [status, setStatus] = useState<AssistantStatus>("OFFLINE");
  const [isActive, setIsActive] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [useSearch, setUseSearch] = useState(true);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [manualPrompt, setManualPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchLatencyMs, setSearchLatencyMs] = useState<number | null>(null);

  // Shadow ref for isSpeaking — read inside callbacks without stale closures
  const isSpeakingRef = useRef(false);

  const isBrowserSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const w = window as typeof window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
  }, []);

  // ─── Audio playback hook ─────────────────────────────────────────────────
  const { isSpeaking, speak, stopSpeaking } = useAudioPlayback({
    onSpeakingChange: (speaking) => {
      isSpeakingRef.current = speaking;
      if (speaking) {
        setStatus("SPEAKING");
      } else if (isActive) {
        setStatus("ONLINE");
        setWakeWordDetected(false);
      }
    },
  });

  // ─── Voice capture hook ──────────────────────────────────────────────────
  const handleFinalTranscript = useCallback(
    async (text: string) => {
      setTranscript(text);
      setWakeWordDetected(false);
      setStatus("PROCESSING");

      // Build history slice (BUG-007: cap at MAX_HISTORY)
      const historySlice = conversationHistory.slice(-MAX_HISTORY);
      const userMsg: Message = { role: "user", content: text };
      setConversationHistory((prev) => [...prev, userMsg].slice(-MAX_HISTORY));
      setIsSending(true);
      setCurrentResponse("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text, history: historySlice, enableSearch: useSearch }),
        });

        if (!res.ok || !res.body) {
          const msg = await res.text();
          setErrorMessage(msg || "Unable to get response");
          setStatus("ERROR");
          setIsSending(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let assembled = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assembled += decoder.decode(value, { stream: true });
          setCurrentResponse(assembled);
        }
        assembled += decoder.decode();
        const finalResponse = assembled.trim();
        setCurrentResponse(finalResponse);

        const assistantMsg: Message = { role: "assistant", content: finalResponse };
        setConversationHistory((prev) => [...prev, assistantMsg].slice(-MAX_HISTORY));

        if (finalResponse) {
          await speak(finalResponse);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setErrorMessage(msg);
        setStatus("ERROR");
      } finally {
        setIsSending(false);
        if (!isSpeakingRef.current) {
          setStatus(isActive ? "ONLINE" : "OFFLINE");
        }
      }
    },
    [conversationHistory, speak, isActive, useSearch],
  );

  const { isCapturing, interimTranscript, startCapture, stopCapture } = useVoiceCapture({
    onFinalTranscript: handleFinalTranscript,
  });

  useEffect(() => {
    if (interimTranscript) setTranscript(interimTranscript);
  }, [interimTranscript]);

  // ─── Wake word hook ──────────────────────────────────────────────────────
  const handleWakeWord = useCallback(() => {
    if (isSpeakingRef.current || isSending) return;
    setWakeWordDetected(true);
    setStatus("LISTENING");
    setTranscript("");
    startCapture();
  }, [isSending, startCapture]);

  useWakeWord({
    enabled: isActive && wakeWordEnabled && !isSpeaking && !isSending,
    isSpeaking,
    onWakeWord: handleWakeWord,
  });

  // ─── Toggle active ────────────────────────────────────────────────────────
  const handleToggleActive = useCallback(() => {
    setIsActive((prev) => {
      const next = !prev;
      if (!next) {
        stopSpeaking();
        stopCapture();
        setStatus("OFFLINE");
        setWakeWordDetected(false);
        setTranscript("");
      } else {
        setStatus("ONLINE");
        setErrorMessage(null);
      }
      return next;
    });
  }, [stopSpeaking, stopCapture]);

  // ─── Manual submit ────────────────────────────────────────────────────────
  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = manualPrompt.trim();
    if (!trimmed || isSending) return;
    setManualPrompt("");
    await handleFinalTranscript(trimmed);
  };

  // ─── Reset ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    stopSpeaking();
    stopCapture();
    setTranscript("");
    setCurrentResponse("");
    setWakeWordDetected(false);
    setErrorMessage(null);
    setSearchLatencyMs(null);
    if (isActive) setStatus("ONLINE");
  }, [stopSpeaking, stopCapture, isActive]);

  // Derive HolographicFace legacy state from status
  const faceState =
    status === "LISTENING"
      ? "listening"
      : status === "PROCESSING"
        ? "processing"
        : status === "SPEAKING"
          ? "speaking"
          : "idle";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">ARNET™ Ecosystem</p>
              <h1 className="text-3xl font-semibold text-white md:text-4xl">
                JARVIS Holographic Assistant
              </h1>
              <p className="text-sm text-slate-300">
                GPT-4o-mini · Wake word detection · ElevenLabs TTS with graceful fallback
              </p>
            </div>
            <StatusBar status={status} errorMessage={errorMessage} />
          </div>
          <ControlPanel
            isActive={isActive}
            wakeWordEnabled={wakeWordEnabled}
            useSearch={useSearch}
            onToggleActive={handleToggleActive}
            onToggleWakeWord={(v) => {
              setWakeWordEnabled(v);
              if (!v) stopCapture();
            }}
            onToggleSearch={setUseSearch}
            onReset={handleReset}
          />
          {!isBrowserSupported && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              Browser Speech API is not available. Use the manual prompt below.
            </div>
          )}
        </header>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <HolographicFace state={faceState} wakeWordDetected={wakeWordDetected} />

          <Card className="flex flex-col gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Voice Loop</p>
              <p className="text-xs text-slate-300">
                Say &quot;Jarvis&quot;, &quot;Hey Jarvis&quot; or &quot;OK Jarvis&quot; to activate.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <StateBadge label="Wake" active={wakeWordDetected} />
                <StateBadge label="Capture" active={isCapturing} />
                <StateBadge label="Speaking" tone="fuchsia" active={isSpeaking} />
                <StateBadge label="Sending" tone="amber" active={isSending} />
              </div>
            </div>

            <TranscriptDisplay
              wakeWordDetected={wakeWordDetected}
              transcript={transcript}
            />

            <ResponseDisplay
              response={currentResponse}
              searchLatencyMs={searchLatencyMs}
            />

            <ChatInput
              value={manualPrompt}
              onChange={setManualPrompt}
              onSubmit={handleManualSubmit}
              disabled={isSending || isSpeaking}
            />
          </Card>
        </div>

        {/* Conversation history */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Conversation</p>
              <p className="text-xs text-slate-300">Last {MAX_HISTORY} messages kept as context.</p>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10">
              {conversationHistory.length} messages
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {conversationHistory
              .filter((m) => m.role !== "system")
              .slice(-6)
              .map((message, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-inner"
                  data-role={message.role}
                >
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
                    {message.role === "user" ? "You" : "JARVIS"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-100">{message.content}</p>
                </div>
              ))}
            {conversationHistory.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-300">
                Activate JARVIS and speak, or type a prompt to begin.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
