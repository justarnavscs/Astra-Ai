import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS Holographic Assistant",
  description:
    "Browser-native streaming AI assistant with wake-word detection, GPT-4o-mini, SearchAPI, and ElevenLabs TTS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
