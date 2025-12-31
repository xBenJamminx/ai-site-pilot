/**
 * Core types for ai-site-pilot
 */

// Chat message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolExecution[];
}

// Tool execution result from the AI
export interface ToolExecution {
  name: string;
  args: Record<string, unknown>;
}

// Streaming event types
export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool'; name: string; args: Record<string, unknown> }
  | { type: 'done' }
  | { type: 'error'; message: string };

// Suggestion for the chat UI
export interface Suggestion {
  text: string;
  icon?: string;
}

// Theme configuration
export interface SitePilotTheme {
  /** Accent color name (e.g., 'amber', 'blue', 'green') or CSS color */
  accent?: string;
  /** Position of the chat panel */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Border radius in pixels */
  borderRadius?: number;
}

// Feature toggles
export interface SitePilotFeatures {
  /** Enable speech recognition input */
  speech?: boolean;
  /** Enable text-to-speech for responses */
  tts?: boolean;
  /** Enable fullscreen mode toggle */
  fullscreen?: boolean;
  /** Show suggestion chips */
  suggestions?: boolean;
}

// Main component props
export interface SitePilotProps {
  /** API endpoint for chat (e.g., '/api/chat') */
  apiEndpoint: string;
  /** Theme configuration */
  theme?: SitePilotTheme;
  /** Suggestion prompts to show */
  suggestions?: Suggestion[];
  /** Feature toggles */
  features?: SitePilotFeatures;
  /** Callback when a tool is called by the AI */
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void | Promise<void>;
  /** Initial open state */
  defaultOpen?: boolean;
  /** Placeholder text for input */
  placeholder?: string;
  /** Welcome message shown before first interaction */
  welcomeMessage?: string;
  /** Custom class name for the container */
  className?: string;
}

// API handler configuration
export interface ChatHandlerConfig {
  /** The AI model to use (from Vercel AI SDK) */
  model: Parameters<typeof import('ai').streamText>[0]['model'];
  /** System prompt for the AI */
  systemPrompt: string;
  /** Tool definitions for the AI */
  tools?: ToolDefinition[];
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
}

// Tool definition for the registry
export interface ToolDefinition<TParams extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique name for the tool */
  name: string;
  /** Description shown to the AI */
  description: string;
  /** Parameter schema */
  parameters: ToolParameters;
  /** Handler function (client-side only) */
  handler?: (params: TParams) => void | Promise<void>;
}

// Tool parameter schema
export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameterProperty>;
  required: string[];
}

// Individual parameter property
export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  enum?: string[];
  items?: { type: string };
}
