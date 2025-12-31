'use client';

import React from 'react';
import { Send, Mic, MicOff } from 'lucide-react';

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  isListening?: boolean;
  onToggleListening?: () => void;
  showMic?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Type a message...',
  isListening = false,
  onToggleListening,
  showMic = false,
}: ChatInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 pilot-border-top">
      <div className="flex items-center gap-2 pilot-input-container px-4 py-3 transition-colors">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent flex-1 outline-none text-sm pilot-input"
          placeholder={isListening ? 'Listening...' : placeholder}
          disabled={disabled}
        />
        {showMic && onToggleListening && (
          <button
            type="button"
            onClick={onToggleListening}
            disabled={disabled}
            className={`p-2 rounded-xl transition-all ${
              isListening ? 'pilot-mic-active' : 'pilot-mic-inactive'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className={`p-2 rounded-xl transition-all ${
            value.trim() && !disabled ? 'pilot-send-active' : 'pilot-send-inactive'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
