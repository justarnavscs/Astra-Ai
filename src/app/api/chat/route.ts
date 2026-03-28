import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextResponse } from "next/server";

type SearchResult = {
  title: string;
  link: string;
  snippet?: string;
};

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const { prompt, includeSearch, searchResults }: { prompt?: string; includeSearch?: boolean; searchResults?: SearchResult[] } =
    await req.json();

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const resolvedSearchResults =
    includeSearch && Array.isArray(searchResults) ? searchResults : [];

  const context = resolvedSearchResults
    .map((item, index) => `${index + 1}. ${item.title} — ${item.snippet ?? ""} (${item.link})`)
    .join("\n");

  const system = `
You are JARVIS, a concise, real-time voice assistant inspired by Iron Man.
- Prefer short, spoken-friendly answers (1-3 sentences).
- If search context is provided, ground answers in it and cite the result numbers in-line.
- If no search data, answer from general knowledge.
- Use an assisting tone; avoid Markdown.
`;

  const user = context
    ? `User request: ${prompt}\nRecent search results:\n${context}`
    : `User request: ${prompt}`;

  const result = await streamText({
    model: gemini("gemini-1.5-flash"),
    system,
    messages: [{ role: "user", content: user }],
  });

  return result.toTextStreamResponse();
}
