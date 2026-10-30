import { useCallback, useEffect, useRef, useState } from "react";

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function useSpeechInput(onFinalText: (text: string) => void, language = "ar-SA") {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = Boolean(getSpeechRecognitionConstructor());

  useEffect(() => () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const toggle = useCallback(() => {
    const Constructor = getSpeechRecognitionConstructor();
    if (!Constructor) {
      setError("الإدخال الصوتي غير مدعوم في هذا المتصفح. يمكنك الكتابة مباشرة.");
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new Constructor();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const spoken = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (spoken) onFinalText(spoken);
    };
    recognition.onerror = (event) => {
      setError(event.error === "not-allowed" ? "اسمح للمتصفح باستخدام الميكروفون ثم حاول مرة أخرى." : "تعذر فهم الصوت. جرّب التحدث بوضوح أو اكتب الأمر.");
      recognitionRef.current = null;
      setListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    setError(null);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [language, onFinalText]);

  return { supported, listening, error, toggle };
}
