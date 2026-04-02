import { NextResponse } from "next/server";
import { sanitiseForTTS } from "@/lib/sanitise";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const ELEVENLABS_TIMEOUT_MS = 8000;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text } = body as { text?: string };

  if (!text?.trim()) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL ?? "eleven_monolingual_v1";
  const maxChars = Number(process.env.TTS_MAX_CHARS ?? 500);

  // Server-side sanitisation + hard char limit (BUG-005 server side cap)
  const sanitised = sanitiseForTTS(text, maxChars);

  if (!sanitised) {
    return NextResponse.json({ error: "Text is empty after sanitisation." }, { status: 400 });
  }

  try {
    // BUG-005: enforce timeout on ElevenLabs request
    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: sanitised,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
        signal: AbortSignal.timeout(ELEVENLABS_TIMEOUT_MS),
      },
    );

    if (!elevenResponse.ok) {
      const errorText = await elevenResponse.text();
      return NextResponse.json(
        { error: `ElevenLabs request failed: ${errorText}` },
        { status: 502 },
      );
    }

    const buffer = await elevenResponse.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Speech synthesis failed: ${message}` },
      { status: 503 },
    );
  }
}
