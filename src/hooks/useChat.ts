'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, ToolExecution, StreamEvent } from '../types';

export interface UseChatOptions {
  /** API endpoint for chat */
  apiEndpoint: string;
  /** Initial messages */
  initialMessages?: ChatMessage[];
  /** Callback when a tool is called */
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void | Promise<void>;
  /** Callback when streaming starts */
  onStreamStart?: () => void;
  /** Callback when streaming ends */
  onStreamEnd?: () => void;
  /** Generate a fallback message when AI uses tools but provides no text.
   * If not provided, uses a generic fallback message. */
  generateFallbackMessage?: (toolCalls: ToolExecution[]) => string;
}

export interface UseChatReturn {
  /** All messages in the conversation */
  messages: ChatMessage[];
  /** Current input value */
  input: string;
  /** Set the input value */
  setInput: (value: string) => void;
  /** Whether the assistant is currently responding */
  isLoading: boolean;
  /** ID of the currently streaming message */
  streamingMessageId: string | null;
  /** Send a message */
  sendMessage: (content?: string) => Promise<void>;
  /** Clear all messages */
  clearMessages: () => void;
  /** Add a message manually */
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
}

/**
 * Hook for managing chat state and streaming
 */
export function useChat(options: UseChatOptions): UseChatReturn {
  const { apiEndpoint, initialMessages = [], onToolCall, onStreamStart, onStreamEnd, generateFallbackMessage } = options;

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const sendMessage = useCallback(
    async (content?: string) => {
      const messageContent = content || input;
      if (!messageContent.trim() || isLoading) return;

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: messageContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      onStreamStart?.();

      // Add placeholder for assistant message
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        toolCalls: [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingMessageId(assistantMessageId);

      let fullText = '';
      const toolCalls: ToolExecution[] = [];

      try {
        // Prepare messages for API (convert to format expected by API)
        const apiMessages = messages.concat(userMessage).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to get response');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as StreamEvent;

                if (data.type === 'text') {
                  fullText += data.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId ? { ...m, content: fullText } : m
                    )
                  );
                } else if (data.type === 'tool') {
                  const toolCall = { name: data.name, args: data.args };
                  toolCalls.push(toolCall);

                  // Execute tool call callback
                  if (onToolCall) {
                    try {
                      await onToolCall(data.name, data.args);
                    } catch (e) {
                      console.error('Tool execution error:', e);
                    }
                  }
                } else if (data.type === 'done') {
                  // Update message with tool calls
                  if (toolCalls.length > 0) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessageId ? { ...m, toolCalls } : m
                      )
                    );
                  }

                  // If no text, generate contextual fallback based on tools used
                  if (!fullText && toolCalls.length > 0 && generateFallbackMessage) {
                    const fallbackMessage = generateFallbackMessage(toolCalls);
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessageId
                          ? { ...m, content: fallbackMessage }
                          : m
                      )
                    );
                  } else if (!fullText) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessageId
                          ? { ...m, content: "I've made some changes. Take a look!" }
                          : m
                      )
                    );
                  }
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }

        console.error('Chat error:', error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: 'Sorry, I encountered an error. Please try again.' }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        setStreamingMessageId(null);
        onStreamEnd?.();
      }
    },
    [apiEndpoint, input, isLoading, messages, onToolCall, onStreamStart, onStreamEnd, generateFallbackMessage]
  );

  return {
    messages,
    input,
    setInput,
    isLoading,
    streamingMessageId,
    sendMessage,
    clearMessages,
    addMessage,
  };
}
