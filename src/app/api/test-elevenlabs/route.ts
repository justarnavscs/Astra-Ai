import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not configured." }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `ElevenLabs API returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { voices?: unknown[] };
    const voiceCount = data.voices?.length ?? 0;
    return NextResponse.json({ ok: true, voiceCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
