/**
 * Universal chat handler using OpenRouter
 * Works with any model: Gemini, GPT-4, Claude, Llama, etc.
 * No SDK required - just standard fetch.
 */

import type { ToolDefinition } from '../tools/types';
import { createSSEEncoder, getSSEHeaders } from './streaming';
import { generateSystemPrompt, type SiteContent } from './generateSystemPrompt';

interface BaseHandlerConfig {
  /** OpenRouter API key (or set OPENROUTER_API_KEY env var) */
  apiKey?: string;
  /** Model to use (e.g., 'google/gemini-2.0-flash', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet') */
  model?: string;
  /** Tool definitions for the AI */
  tools?: ToolDefinition[];
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Your site URL (shown in OpenRouter dashboard) */
  siteUrl?: string;
  /** Your app name (shown in OpenRouter dashboard) */
  siteName?: string;
}

interface HandlerConfigWithPrompt extends BaseHandlerConfig {
  /** System prompt for the AI (use this OR siteContent, not both) */
  systemPrompt: string;
  siteContent?: never;
}

interface HandlerConfigWithContent extends BaseHandlerConfig {
  /** Site content to auto-generate system prompt (use this OR systemPrompt, not both) */
  siteContent: SiteContent;
  systemPrompt?: never;
}

export type HandlerConfig = HandlerConfigWithPrompt | HandlerConfigWithContent;

interface RequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

/**
 * Convert tool definitions to OpenAI/OpenRouter format
 */
function convertTools(tools: ToolDefinition[]): OpenRouterTool[] {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object' as const,
        properties: Object.fromEntries(
          Object.entries(tool.parameters.properties).map(([key, value]) => [
            key,
            {
              type: value.type,
              description: value.description,
              ...(value.enum && { enum: value.enum }),
            },
          ])
        ),
        required: tool.parameters.required,
      },
    },
  }));
}

/**
 * Create a Next.js API route handler using OpenRouter
 *
 * Works with any model - just change the model string:
 * - 'google/gemini-2.0-flash'
 * - 'openai/gpt-4o'
 * - 'anthropic/claude-3.5-sonnet'
 * - 'meta-llama/llama-3.1-70b-instruct'
 *
 * @example
 * ```ts
 * // app/api/chat/route.ts
 * import { createHandler } from 'ai-site-pilot/api';
 *
 * export const POST = createHandler({
 *   model: 'google/gemini-2.0-flash',
 *   systemPrompt: 'You are a helpful assistant...',
 *   tools: myTools,
 * });
 * ```
 */
export function createHandler(config: HandlerConfig) {
  const {
    apiKey = process.env.OPENROUTER_API_KEY,
    model = 'google/gemini-2.0-flash',
    tools = [],
    temperature = 0.7,
    siteUrl,
    siteName,
  } = config;

  // Generate system prompt from siteContent or use provided systemPrompt
  const systemPrompt = 'siteContent' in config && config.siteContent
    ? generateSystemPrompt(config.siteContent)
    : (config as HandlerConfigWithPrompt).systemPrompt;

  return async function POST(req: Request): Promise<Response> {
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenRouter API key not configured. Get one at https://openrouter.ai' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const body = (await req.json()) as RequestBody;
      const { messages } = body;

      // Build messages array with system prompt
      const openRouterMessages: OpenRouterMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
          content: m.content,
        })),
      ];

      const sse = createSSEEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': siteUrl || '',
                'X-Title': siteName || '',
              },
              body: JSON.stringify({
                model,
                messages: openRouterMessages,
                temperature,
                stream: true,
                ...(tools.length > 0 && { tools: convertTools(tools) }),
              }),
            });

            if (!response.ok) {
              const error = await response.text();
              console.error('OpenRouter error:', error);
              controller.enqueue(sse.encodeError('Failed to get AI response'));
              controller.enqueue(sse.encodeDone());
              controller.close();
              return;
            }

            const reader = response.body?.getReader();
            if (!reader) {
              controller.enqueue(sse.encodeError('No response stream'));
              controller.enqueue(sse.encodeDone());
              controller.close();
              return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            // Accumulate tool calls across stream chunks
            // OpenRouter streams tool calls in pieces: name first, then arguments in chunks
            const pendingToolCalls: Map<number, { name: string; arguments: string }> = new Map();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta;

                    // Handle text content
                    if (delta?.content) {
                      controller.enqueue(sse.encodeText(delta.content));
                    }

                    // Handle tool calls - accumulate across chunks
                    if (delta?.tool_calls) {
                      for (const toolCall of delta.tool_calls) {
                        const index = toolCall.index ?? 0;

                        // Get or create pending tool call
                        let pending = pendingToolCalls.get(index);
                        if (!pending) {
                          pending = { name: '', arguments: '' };
                          pendingToolCalls.set(index, pending);
                        }

                        // Accumulate name (usually comes in first chunk)
                        if (toolCall.function?.name) {
                          pending.name = toolCall.function.name;
                        }

                        // Accumulate arguments (streamed in chunks)
                        if (toolCall.function?.arguments) {
                          pending.arguments += toolCall.function.arguments;
                        }
                      }
                    }
                  } catch {
                    // Skip malformed JSON
                  }
                }
              }
            }

            // Emit all accumulated tool calls now that streaming is complete
            for (const [, toolCall] of pendingToolCalls) {
              if (toolCall.name && toolCall.arguments) {
                try {
                  const args = JSON.parse(toolCall.arguments);
                  controller.enqueue(sse.encodeTool(toolCall.name, args));
                } catch (e) {
                  console.error('Failed to parse tool arguments:', toolCall.arguments, e);
                }
              }
            }

            controller.enqueue(sse.encodeDone());
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(sse.encodeError('An error occurred during streaming'));
            controller.close();
          }
        },
      });

      return new Response(stream, { headers: getSSEHeaders() });
    } catch (error) {
      console.error('Handler error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}
