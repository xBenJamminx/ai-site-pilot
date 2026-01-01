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

// Theme configuration - all colors accept CSS color values (hex, rgb, hsl, etc.)
export interface SitePilotTheme {
  /** Position of the chat panel */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Border radius in pixels */
  borderRadius?: number;

  // Color customization - accepts any CSS color value
  /** Primary accent color (buttons, highlights) - e.g., '#f59e0b' or 'rgb(245, 158, 11)' */
  accentColor?: string;
  /** Secondary accent color for gradients - defaults to darker version of accentColor */
  accentColorDark?: string;
  /** Panel background color - e.g., '#0F0720' */
  backgroundColor?: string;
  /** Primary text color - e.g., '#ffffff' */
  textColor?: string;
  /** Muted/secondary text color - e.g., '#a1a1aa' */
  textMutedColor?: string;
  /** Border color - e.g., 'rgba(255,255,255,0.1)' */
  borderColor?: string;
  /** User message background (gradient start) */
  userMessageBg?: string;
  /** Assistant message background */
  assistantMessageBg?: string;
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
  /** Generate a fallback message when AI uses tools but provides no text.
   * Use createFallbackMessageGenerator() helper for easy setup. */
  generateFallbackMessage?: (toolCalls: ToolExecution[]) => string;
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
