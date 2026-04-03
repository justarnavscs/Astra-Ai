"use client";

import { useCallback, useRef, useState } from "react";
import { decodeAudio, playAudioBuffer } from "@/lib/audio";

const TTS_TIMEOUT_MS = 8000;
const MAX_CHARS = 500;

type AudioPlaybackOptions = {
  onSpeakingChange: (speaking: boolean) => void;
};

/**
 * useAudioPlayback — ElevenLabs TTS with browser-synthesis fallback.
 *
 * Fixes applied:
 * BUG-003: AudioContext created lazily; resume() called before decode.
 * BUG-005: AbortSignal.timeout(TTS_TIMEOUT_MS) on ElevenLabs fetch.
 * BUG-009: Audio queue — cancels active audio before starting new playback.
 */
export function useAudioPlayback({ onSpeakingChange }: AudioPlaybackOptions) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const stopCurrentRef = useRef<(() => void) | null>(null);
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  onSpeakingChangeRef.current = onSpeakingChange;

  const setSpeaking = useCallback((value: boolean) => {
    setIsSpeaking(value);
    onSpeakingChangeRef.current(value);
  }, []);

  const speakWithSynthesis = useCallback(
    async (text: string): Promise<void> => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      return new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 0.8;
        utterance.volume = 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.cancel();
        // Register a stop handle for BUG-009
        stopCurrentRef.current = () => window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      });
    },
    [],
  );

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim()) return;

      // BUG-009: cancel any active playback before starting new
      stopCurrentRef.current?.();
      stopCurrentRef.current = null;

      setSpeaking(true);

      const truncated = text.slice(0, MAX_CHARS);

      try {
        // BUG-005: enforce timeout on ElevenLabs fetch
        const res = await fetch("/api/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: truncated }),
          signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
        });

        if (res.ok) {
          const buffer = await res.arrayBuffer();
          // BUG-003: decodeAudio uses resumeAudioContext() internally
          const audioBuffer = await decodeAudio(buffer);
          const { stop, promise } = playAudioBuffer(audioBuffer);
          stopCurrentRef.current = stop;
          await promise;
          stopCurrentRef.current = null;
        } else {
          await speakWithSynthesis(truncated);
        }
      } catch {
        // BUG-005 fallback: any fetch failure (timeout, network) → browser TTS
        await speakWithSynthesis(truncated);
      } finally {
        setSpeaking(false);
      }
    },
    [setSpeaking, speakWithSynthesis],
  );

  const stopSpeaking = useCallback(() => {
    stopCurrentRef.current?.();
    stopCurrentRef.current = null;
    setSpeaking(false);
  }, [setSpeaking]);

  return { isSpeaking, speak, stopSpeaking };
}
