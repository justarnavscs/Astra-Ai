"use client";

import { useCallback, useRef, useState } from "react";

type VoiceCaptureOptions = {
  onFinalTranscript: (transcript: string) => void;
};

/**
 * useVoiceCapture — single-shot command-capture recognition.
 *
 * Fixes applied:
 * BUG-004: All recognition callbacks read state via refs (stale-closure safe).
 * BUG-008: Only fires onFinalTranscript when isFinal === true.
 */
export function useVoiceCapture({ onFinalTranscript }: VoiceCaptureOptions) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  const isCapturingRef = useRef(false);

  // Keep callback ref in sync
  onFinalRef.current = onFinalTranscript;

  const stopCapture = useCallback(() => {
    isCapturingRef.current = false;
    setIsCapturing(false);
    setInterimTranscript("");
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const startCapture = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isCapturingRef.current) return;

    const anyWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    const SpeechRecognitionCtor =
      anyWindow.SpeechRecognition ?? anyWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const rec = new SpeechRecognitionCtor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      isCapturingRef.current = true;
      setIsCapturing(true);
      setInterimTranscript("");
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      if (interim) setInterimTranscript(interim.trim());

      // BUG-008: only send final results to the AI
      if (final.trim()) {
        isCapturingRef.current = false;
        setIsCapturing(false);
        setInterimTranscript("");
        onFinalRef.current(final.trim());
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      isCapturingRef.current = false;
      setIsCapturing(false);
    };

    rec.onend = () => {
      isCapturingRef.current = false;
      setIsCapturing(false);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      // ignore start errors
    }
  }, []);

  return { isCapturing, interimTranscript, startCapture, stopCapture };
}
