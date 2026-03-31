# JARVIS Holographic Assistant (Astra-Ai)

Browser-based, full-stack intelligent agent inspired by Iron Man. Built with Next.js, TypeScript, Tailwind, and the Vercel AI SDK (Gemini 1.5 Flash). Includes real-time wake-word detection, web search, and resilient text-to-speech with ElevenLabs fallback to the browser SpeechSynthesis API.

## Key Features
- **Always-on wake word**: Passive detection for “Jarvis” / “Hey Jarvis,” guarded to avoid self-trigger loops while speaking.
- **Streaming Gemini 1.5**: Low-latency responses via Vercel AI SDK.
- **Web search**: SearchAPI.io integration to enrich responses with fresh context.
- **Voice pipeline**: Web Speech API STT → Gemini → ElevenLabs TTS, with automatic fallback to native speech synthesis if ElevenLabs fails or is unconfigured.
- **Holographic UI**: Tailwind CSS holographic face with LISTENING/SPEAKING states and CSS-only animations.
- **Secure by design**: All secrets remain server-side; the client never sees API keys.

## Requirements
- Node.js 18+
- API keys: `GOOGLE_GENERATIVE_AI_API_KEY`, `SEARCHAPI_API_KEY`, `ELEVENLABS_API_KEY`, optional `ELEVENLABS_VOICE_ID`
- Chrome/Edge recommended (SpeechRecognition performs best). Safari/Firefox may degrade gracefully to manual text input.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment file and add keys:
   ```bash
   cp .env.example .env.local
   # populate GOOGLE_GENERATIVE_AI_API_KEY, SEARCHAPI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Visit `http://localhost:3000` and say “Jarvis” (or use the manual prompt box).

## Project structure

The repository follows the same layout as the tutorial video. Key files are:

```
src/
  app/
    api/
      chat/route.ts     # Streams Gemini 1.5 Flash responses
      search/route.ts   # Proxies SearchAPI.io queries
      tts/route.ts      # ElevenLabs text-to-speech endpoint
    globals.css         # Tailwind v4 setup + animations
    layout.tsx          # Root layout metadata + shell
    page.tsx            # Holographic assistant UI and client logic
  components/
    HolographicFace.tsx # Face visualization + state badges
  types/
    speech.d.ts         # Web Speech API typings
public/                 # Static assets (icons, svgs)
```

An `.env.example` file is provided at the repo root with all required keys. Start from that file to configure your own `.env.local`.

## Notes
- Wake-word listener pauses during playback to avoid Jarvis triggering itself.
- If ElevenLabs is unavailable, speech falls back to the browser’s SpeechSynthesis automatically.
- Search can be toggled off in the UI; responses will rely on model knowledge only.
