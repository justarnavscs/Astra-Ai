import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.SEARCHAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SEARCHAPI_API_KEY not configured." }, { status: 500 });
  }

  try {
    const url = new URL("https://www.searchapi.io/api/v1/search");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", "test");

    const res = await fetch(url.toString(), {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `SearchAPI returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { organic_results?: unknown[] };
    const resultCount = data.organic_results?.length ?? 0;
    return NextResponse.json({ ok: true, resultCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
