/**
 * AudioContext utilities.
 * BUG-003: iOS Safari suspends AudioContext — create lazily inside
 * a user-gesture handler and always call resume() before decoding.
 */

let sharedContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new AudioContext();
  }
  return sharedContext;
}

/** Ensure the shared AudioContext is running (handles iOS suspend). */
export async function resumeAudioContext(): Promise<AudioContext> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  return ctx;
}

/**
 * Decode an ArrayBuffer into an AudioBuffer using the shared context.
 * Must be called after a user gesture to satisfy iOS autoplay policy.
 */
export async function decodeAudio(buffer: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = await resumeAudioContext();
  return ctx.decodeAudioData(buffer);
}

/**
 * Play an AudioBuffer and resolve when playback ends.
 * Returns a cleanup function that stops playback immediately.
 */
export function playAudioBuffer(
  audioBuffer: AudioBuffer,
  onEnd?: () => void,
): { stop: () => void; promise: Promise<void> } {
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  const promise = new Promise<void>((resolve) => {
    source.onended = () => {
      resolve();
      onEnd?.();
    };
    source.start(0);
  });

  return {
    stop: () => {
      try {
        source.stop();
      } catch {
        // Already stopped or never started — safe to ignore
      }
    },
    promise,
  };
}
