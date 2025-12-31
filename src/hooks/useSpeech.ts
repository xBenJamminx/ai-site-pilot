'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export interface UseSpeechOptions {
  /** Language for speech recognition */
  lang?: string;
  /** Callback when speech is recognized */
  onResult?: (transcript: string, isFinal: boolean) => void;
}

export interface UseSpeechReturn {
  /** Whether speech recognition is supported */
  isSupported: boolean;
  /** Whether currently listening */
  isListening: boolean;
  /** Toggle listening on/off */
  toggleListening: () => void;
  /** Start listening */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Speak text using TTS */
  speak: (text: string) => void;
  /** Whether TTS is enabled */
  ttsEnabled: boolean;
  /** Toggle TTS on/off */
  setTtsEnabled: (enabled: boolean) => void;
  /** Cancel current speech */
  cancelSpeech: () => void;
}

/**
 * Hook for speech recognition and text-to-speech
 */
export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
  const { lang = 'en-US', onResult } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowWithSpeech = window as any;
    const SpeechRecognitionAPI =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = lang;

      recognitionRef.current.onresult = (event) => {
        const result = event.results[0];
        const transcript = result[0].transcript;
        onResult?.(transcript, result.isFinal);

        if (result.isFinal) {
          setIsListening(false);
        }
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, [lang, onResult]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.error('Speech recognition error:', e);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const speak = useCallback(
    (text: string) => {
      if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Try to find a good voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      speechSynthesis.speak(utterance);
    },
    [ttsEnabled]
  );

  const cancelSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }, []);

  return {
    isSupported,
    isListening,
    toggleListening,
    startListening,
    stopListening,
    speak,
    ttsEnabled,
    setTtsEnabled,
    cancelSpeech,
  };
}
