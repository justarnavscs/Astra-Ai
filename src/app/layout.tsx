import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS Holographic Assistant",
  description:
    "A browser-native, streaming AI assistant with wake-word detection, Gemini 1.5, SearchAPI, and ElevenLabs speech.",
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
