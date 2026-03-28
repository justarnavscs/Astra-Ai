import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const query = body?.query as string | undefined;

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  const apiKey = process.env.SEARCHAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SEARCHAPI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const url = new URL("https://www.searchapi.io/api/v1/search");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    cache: "no-cache",
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `Search API request failed: ${response.status} ${errorText}` },
      { status: 502 },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
