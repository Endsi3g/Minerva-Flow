"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps the browser's native Web Speech API (no external service, no API
 * key). Unsupported on Firefox and most Safari versions — callers should
 * hide/disable the mic button when isSupported is false.
 */
export function useSpeechRecognition({ lang = "fr-CA" }: { lang?: string } = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onFinalChunkRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setIsSupported(Boolean(SR));
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          onFinalChunkRef.current?.(transcript);
        } else {
          interim += transcript;
        }
      }
      setInterimTranscript(interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, [lang]);

  function start(onFinalChunk: (text: string) => void) {
    if (!recognitionRef.current) return;
    onFinalChunkRef.current = onFinalChunk;
    setIsListening(true);
    recognitionRef.current.start();
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return { isSupported, isListening, interimTranscript, start, stop };
}
