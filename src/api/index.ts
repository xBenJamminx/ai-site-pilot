/**
 * API exports
 */

// Main handler using OpenRouter (works with any model)
export { createHandler } from './createHandler';
export type { HandlerConfig } from './createHandler';

// System prompt generator for easy setup
export { generateSystemPrompt } from './generateSystemPrompt';
export type { SiteContent, SiteContentItem } from './generateSystemPrompt';

// SSE utilities for custom implementations
export { createSSEEncoder, getSSEHeaders, parseSSEStream } from './streaming';
