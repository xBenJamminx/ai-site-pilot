/**
 * ai-site-pilot
 *
 * AI chat widget that can control and navigate your website.
 * Full-stack solution with streaming, tool system, and polished UI.
 *
 * @example
 * ```tsx
 * import { SitePilot } from 'ai-site-pilot';
 * import 'ai-site-pilot/styles.css';
 *
 * <SitePilot
 *   apiEndpoint="/api/chat"
 *   suggestions={[
 *     { text: 'Show me products', icon: '🛍️' },
 *   ]}
 *   onToolCall={(name, args) => {
 *     // Handle AI tool calls
 *   }}
 * />
 * ```
 */

// Main component
export { SitePilot, default } from './components/SitePilot';
export { ChatMessage } from './components/ChatMessage';
export { ChatInput } from './components/ChatInput';
export { Suggestions } from './components/Suggestions';

// Hooks
export { useChat } from './hooks/useChat';
export { useSpeech } from './hooks/useSpeech';

// Tools
export { createFallbackMessageGenerator, createToolRegistry, defineTool, defineSimpleTool, ToolRegistry } from './tools';

// Types
export type {
  ChatMessage as ChatMessageType,
  ToolExecution,
  StreamEvent,
  Suggestion,
  SitePilotTheme,
  SitePilotFeatures,
  SitePilotProps,
} from './types';
