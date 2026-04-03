import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { JARVIS_SYSTEM_PROMPT } from "@/lib/prompts";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 50;

type Message = {
  role: "user" | "assistant";
  content: string;
};

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { prompt, history, enableSearch } = body as {
    prompt?: string;
    history?: Message[];
    enableSearch?: boolean;
  };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  // Server-side prompt injection guard: enforce character limit
  const sanitisedPrompt = prompt.trim().slice(0, MAX_MESSAGE_LENGTH);

  const resolvedHistory: Message[] = Array.isArray(history)
    ? history.slice(-MAX_HISTORY_MESSAGES)
    : [];

  const messages: Message[] = [
    ...resolvedHistory,
    { role: "user", content: sanitisedPrompt },
  ];

  const searchApiKey = enableSearch !== false ? process.env.SEARCHAPI_API_KEY : undefined;

  const result = await streamText({
    model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
    system: JARVIS_SYSTEM_PROMPT,
    messages,
    stopWhen: stepCountIs(3),
    tools: searchApiKey
      ? {
          web_search: tool({
            description:
              "Search the web for current information. Use for post-2023 events or time-sensitive queries.",
            inputSchema: z.object({
              query: z.string().describe("The search query"),
            }),
            execute: async (input) => {
              const { query } = input as { query: string };
              try {
                const url = new URL("https://www.searchapi.io/api/v1/search");
                url.searchParams.set("engine", "google");
                url.searchParams.set("q", query);

                const res = await fetch(url.toString(), {
                  headers: { "x-api-key": searchApiKey },
                  signal: AbortSignal.timeout(8000),
                });

                if (!res.ok) return { results: [] };

                const data = (await res.json()) as {
                  organic_results?: Array<{
                    title: string;
                    link: string;
                    snippet?: string;
                  }>;
                };
                const results = (data.organic_results ?? [])
                  .slice(0, 4)
                  .map((r) => ({ title: r.title, link: r.link, snippet: r.snippet ?? "" }));

                return { results };
              } catch {
                return { results: [] };
              }
            },
          }),
        }
      : undefined,
  });

  return result.toTextStreamResponse();
}
