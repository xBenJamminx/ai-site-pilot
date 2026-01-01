/**
 * API exports
 */

// Main handler using OpenRouter (works with any model)
export { createHandler } from './createHandler';
export type { HandlerConfig } from './createHandler';

// SSE utilities for custom implementations
export { createSSEEncoder, getSSEHeaders, parseSSEStream } from './streaming';
