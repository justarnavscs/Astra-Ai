type SpeechRecognitionConstructor = new () => SpeechRecognition;

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart?: () => void;
  onaudioend?: () => void;
  onsoundend?: () => void;
  onspeechend?: () => void;
  onerror?: (event: SpeechRecognitionErrorEvent) => void;
  onresult?: (event: SpeechRecognitionEvent) => void;
  onend?: () => void;
}

type SpeechRecognitionErrorEvent = {
  error: string;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResult[];
};

interface Window {
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  SpeechRecognition?: SpeechRecognitionConstructor;
}
