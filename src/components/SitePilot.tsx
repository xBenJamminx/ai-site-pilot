'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Sparkles, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useSpeech } from '../hooks/useSpeech';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Suggestions } from './Suggestions';
import type { SitePilotProps, ChatMessage as ChatMessageType } from '../types';

/**
 * SitePilot - AI chat widget that can control and navigate your website
 *
 * @example
 * ```tsx
 * import { SitePilot } from 'ai-site-pilot';
 *
 * <SitePilot
 *   apiEndpoint="/api/chat"
 *   suggestions={[
 *     { text: 'Show me products', icon: '🛍️' },
 *     { text: 'Help me find...', icon: '🔍' },
 *   ]}
 *   onToolCall={(name, args) => {
 *     // Handle tool execution
 *   }}
 * />
 * ```
 */
export function SitePilot({
  apiEndpoint,
  theme = {},
  suggestions = [],
  features = {},
  onToolCall,
  defaultOpen = false,
  placeholder = 'Type a message...',
  welcomeMessage = "Hi! I'm here to help you navigate and explore. What would you like to know?",
  className = '',
}: SitePilotProps) {
  const {
    position = 'bottom-right',
    borderRadius = 24,
    accentColor,
    accentColorDark,
    backgroundColor,
    textColor,
    textMutedColor,
    borderColor,
    userMessageBg,
    assistantMessageBg,
  } = theme;

  const {
    speech = true,
    tts = true,
    fullscreen = true,
    suggestions: showSuggestionsFeature = true,
  } = features;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome message
  const initialMessages: ChatMessageType[] = welcomeMessage
    ? [
        {
          id: 'init',
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date(),
        },
      ]
    : [];

  const {
    messages,
    input,
    setInput,
    isLoading,
    streamingMessageId,
    sendMessage,
  } = useChat({
    apiEndpoint,
    initialMessages,
    onToolCall,
    onStreamStart: () => setShowSuggestions(false),
  });

  const {
    isSupported: speechSupported,
    isListening,
    toggleListening,
    speak,
    ttsEnabled,
    setTtsEnabled,
  } = useSpeech({
    onResult: (transcript, isFinal) => {
      setInput(transcript);
      if (isFinal) {
        // Could auto-submit here if desired
      }
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Speak assistant messages when TTS is enabled
  useEffect(() => {
    if (!ttsEnabled) return;

    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === 'assistant' &&
      lastMessage.id !== streamingMessageId &&
      lastMessage.content
    ) {
      speak(lastMessage.content);
    }
  }, [messages, streamingMessageId, ttsEnabled, speak]);

  const handleSuggestionSelect = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage]
  );

  const handleSubmit = useCallback(() => {
    sendMessage();
  }, [sendMessage]);

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-24 right-6 md:right-8',
    'bottom-left': 'bottom-24 left-6 md:left-8',
    'top-right': 'top-24 right-6 md:right-8',
    'top-left': 'top-24 left-6 md:left-8',
  };

  const buttonPositionClasses = {
    'bottom-right': 'bottom-6 right-6 md:right-8',
    'bottom-left': 'bottom-6 left-6 md:left-8',
    'top-right': 'top-6 right-6 md:right-8',
    'top-left': 'top-6 left-6 md:left-8',
  };

  // CSS custom properties for theming
  const cssVars = {
    '--pilot-radius': `${borderRadius}px`,
    ...(accentColor && { '--pilot-accent': accentColor }),
    ...(accentColorDark && { '--pilot-accent-dark': accentColorDark }),
    ...(backgroundColor && { '--pilot-bg': backgroundColor, '--pilot-bg-95': `${backgroundColor}f2` }),
    ...(textColor && { '--pilot-text': textColor }),
    ...(textMutedColor && { '--pilot-text-muted': textMutedColor }),
    ...(borderColor && { '--pilot-border': borderColor }),
    ...(userMessageBg && { '--pilot-user-bg': userMessageBg }),
    ...(assistantMessageBg && { '--pilot-assistant-bg': assistantMessageBg }),
  } as React.CSSProperties;

  return (
    <div className={`pilot-container ${className}`} style={cssVars}>
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            layout
            className={`fixed pilot-panel flex flex-col shadow-2xl z-[200] transition-all duration-300 ${
              isFullscreen
                ? 'inset-4 md:inset-8'
                : `${positionClasses[position]} w-[calc(100%-48px)] md:w-[400px] h-[520px]`
            }`}
            style={{ borderRadius: `${borderRadius}px` }}
          >
            {/* Header */}
            <div className="px-5 py-4 pilot-border-bottom flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 pilot-avatar rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold pilot-text text-sm">AI Assistant</div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 pilot-status-dot rounded-full animate-pulse" />
                    <span className="text-[10px] pilot-text-muted">Ready to help</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {tts && (
                  <button
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`p-2 rounded-lg transition-colors ${
                      ttsEnabled ? 'pilot-button-active' : 'pilot-button-inactive'
                    }`}
                    title={ttsEnabled ? 'Disable voice' : 'Enable voice'}
                  >
                    {ttsEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                  </button>
                )}
                {fullscreen && (
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 rounded-lg transition-colors pilot-button-inactive"
                    title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 pilot-text-muted" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={streamingMessageId === msg.id}
                  isFullscreen={isFullscreen}
                />
              ))}

              {/* Loading indicator */}
              {isLoading && !streamingMessageId && (
                <div className="flex justify-start">
                  <div className="pilot-loading px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1.5">
                      {[0, 0.15, 0.3].map((delay, i) => (
                        <motion.span
                          key={i}
                          className="w-2 h-2 pilot-loading-dot rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {showSuggestionsFeature && suggestions.length > 0 && (
                <Suggestions
                  suggestions={suggestions}
                  onSelect={handleSuggestionSelect}
                  isVisible={showSuggestions && !isLoading}
                  isFullscreen={isFullscreen}
                />
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              disabled={isLoading}
              placeholder={placeholder}
              isListening={isListening}
              onToggleListening={toggleListening}
              showMic={speech && speechSupported}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`fixed ${buttonPositionClasses[position]} flex items-center gap-2 pilot-toggle-button px-5 py-3.5 rounded-2xl font-medium shadow-xl transition-shadow z-[200]`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">Ask AI</span>
          <span className="w-2 h-2 bg-white/80 rounded-full animate-pulse" />
        </motion.button>
      )}
    </div>
  );
}

export default SitePilot;
