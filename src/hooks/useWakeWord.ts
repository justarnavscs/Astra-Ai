"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WAKE_WORDS = ["jarvis", "hey jarvis", "ok jarvis"];
const RESTART_DELAY_MS = 300;
const BACKOFF_DELAY_MS = 2000;
const BACKOFF_THRESHOLD = 3;

type WakeWordOptions = {
  enabled: boolean;
  isSpeaking: boolean;
  onWakeWord: () => void;
};

/**
 * useWakeWord — always-on background wake-word listener.
 *
 * Fixes applied:
 * BUG-001: Stops listening while isSpeaking (prevents TTS feedback loop).
 * BUG-002: Page Visibility API pauses recognition when tab is hidden,
 *           restarts when visible again.
 * BUG-004: All recognition callbacks read state via refs (stale-closure safe).
 * BUG-012: Wake-word comparison done after toLowerCase().
 */
export function useWakeWord({ enabled, isSpeaking, onWakeWord }: WakeWordOptions) {
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const enabledRef = useRef(enabled);
  const isSpeakingRef = useRef(isSpeaking);
  const onWakeWordRef = useRef(onWakeWord);
  const failCountRef = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with latest prop values
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { onWakeWordRef.current = onWakeWord; }, [onWakeWord]);

  const stopRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

  const startRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!enabledRef.current || isSpeakingRef.current) return;

    const anyWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    const SpeechRecognitionCtor =
      anyWindow.SpeechRecognition ?? anyWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      failCountRef.current = 0;
      setIsListening(true);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      // BUG-001: ignore results while TTS is active
      if (isSpeakingRef.current) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (WAKE_WORDS.some((word) => transcript.includes(word))) {
          onWakeWordRef.current();
          return;
        }
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") return;
      if (event.error === "aborted") return;
      failCountRef.current += 1;
    };

    rec.onend = () => {
      setIsListening(false);
      if (!enabledRef.current || isSpeakingRef.current) return;
      // BUG-002 + auto-restart with backoff
      const delay =
        failCountRef.current >= BACKOFF_THRESHOLD ? BACKOFF_DELAY_MS : RESTART_DELAY_MS;
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current && !isSpeakingRef.current) {
          try {
            rec.start();
          } catch {
            // ignore if already started
          }
        }
      }, delay);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      // Mic might not be available yet
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopRecognition();
      return;
    }
    if (isSpeaking) {
      // BUG-001: mute the recognition while TTS is playing
      stopRecognition();
      return;
    }
    startRecognition();
    return stopRecognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isSpeaking]);

  // BUG-002: Page Visibility API — pause on hidden, resume on visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopRecognition();
      } else if (enabledRef.current && !isSpeakingRef.current) {
        startRecognition();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [startRecognition, stopRecognition]);

  return { isListening };
}
