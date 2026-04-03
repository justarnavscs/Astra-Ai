export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface JarvisState {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isWakeWordListening: boolean;
  isSending: boolean;
  currentTranscript: string;
  currentResponse: string;
  conversationHistory: Message[];
  errorMessage: string | null;
}

export interface ArnetCommand {
  type: "command";
  id: string;
  action: string;
  params: Record<string, unknown>;
  raw_text: string;
  timestamp: string;
}

export interface ArnetResult {
  type: "result" | "error" | "heartbeat";
  id: string;
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  duration_ms?: number;
}

export interface TTSConfig {
  voiceId: string;
  modelId: string;
  stability: number;
  similarity: number;
  maxChars: number;
}

export type AssistantStatus =
  | "OFFLINE"
  | "ONLINE"
  | "LISTENING"
  | "SPEAKING"
  | "PROCESSING"
  | "ERROR";
