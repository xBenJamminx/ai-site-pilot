/**
 * SSE streaming utilities
 */

import type { StreamEvent } from '../types';

/**
 * Create an SSE encoder for streaming responses
 */
export function createSSEEncoder() {
  const encoder = new TextEncoder();

  return {
    encode(event: StreamEvent): Uint8Array {
      return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
    },

    encodeText(content: string): Uint8Array {
      return encoder.encode(`data: ${JSON.stringify({ type: 'text', content })}\n\n`);
    },

    encodeTool(name: string, args: Record<string, unknown>): Uint8Array {
      return encoder.encode(`data: ${JSON.stringify({ type: 'tool', name, args })}\n\n`);
    },

    encodeDone(): Uint8Array {
      return encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    },

    encodeError(message: string): Uint8Array {
      return encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    },
  };
}

/**
 * Create SSE response headers
 */
export function getSSEHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };
}

/**
 * Parse SSE events from a ReadableStream
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<StreamEvent> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)) as StreamEvent;
          yield data;
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }
}
