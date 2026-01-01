/**
 * API exports
 */

// Vercel AI SDK handler (requires 'ai' package)
export { createChatHandler } from './createChatHandler';
export type { ChatHandlerConfig } from './createChatHandler';

// Gemini direct handler (requires '@google/genai' package - no AI SDK needed!)
export { createGeminiHandler } from './createGeminiHandler';
export type { GeminiHandlerConfig } from './createGeminiHandler';

// SSE utilities for custom implementations
export { createSSEEncoder, getSSEHeaders, parseSSEStream } from './streaming';
