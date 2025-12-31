'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage as ChatMessageType } from '../types';

export interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  isFullscreen?: boolean;
}

export function ChatMessage({ message, isStreaming, isFullscreen }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isFullscreen ? 'max-w-[70%]' : 'max-w-[85%]'
        } ${
          isUser
            ? 'pilot-message-user rounded-br-md'
            : 'pilot-message-assistant rounded-bl-md'
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <div className="pilot-prose">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 pilot-cursor ml-0.5 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
