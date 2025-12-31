/**
 * Factory for creating Next.js API route handlers
 */

import { streamText, type CoreMessage, type LanguageModel } from 'ai';
import type { ToolDefinition } from '../tools/types';
import { createSSEEncoder, getSSEHeaders } from './streaming';

export interface ChatHandlerConfig {
  /** The AI model to use (from Vercel AI SDK) */
  model: LanguageModel;
  /** System prompt for the AI */
  systemPrompt: string;
  /** Tool definitions for the AI */
  tools?: ToolDefinition[];
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
}

interface RequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Convert tool definitions to Vercel AI SDK format
 */
function convertToolsToAISDK(tools: ToolDefinition[]) {
  const result: Record<string, { description: string; parameters: unknown }> = {};

  for (const tool of tools) {
    result[tool.name] = {
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    };
  }

  return result;
}

/**
 * Create a Next.js API route handler for chat
 *
 * Works with any Vercel AI SDK compatible model including:
 * - Google Gemini (@ai-sdk/google)
 * - OpenAI (@ai-sdk/openai)
 * - Anthropic (@ai-sdk/anthropic)
 * - And more...
 *
 * @example
 * ```ts
 * // app/api/chat/route.ts
 * import { createChatHandler } from 'ai-site-pilot/api';
 * import { google } from '@ai-sdk/google';
 *
 * export const POST = createChatHandler({
 *   model: google('gemini-2.0-flash'),
 *   systemPrompt: 'You are a helpful assistant...',
 *   tools: myTools,
 * });
 * ```
 *
 * @example Using OpenAI
 * ```ts
 * import { openai } from '@ai-sdk/openai';
 *
 * export const POST = createChatHandler({
 *   model: openai('gpt-4o'),
 *   systemPrompt: 'You are a helpful assistant...',
 * });
 * ```
 */
export function createChatHandler(config: ChatHandlerConfig) {
  const { model, systemPrompt, tools = [], temperature = 0.7, maxTokens } = config;

  return async function POST(req: Request): Promise<Response> {
    try {
      const body = (await req.json()) as RequestBody;
      const { messages } = body;

      // Convert messages to CoreMessage format
      const coreMessages: CoreMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Create the SSE encoder
      const sse = createSSEEncoder();

      // Create a readable stream for SSE
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const result = streamText({
              model,
              system: systemPrompt,
              messages: coreMessages,
              temperature,
              maxTokens,
              tools: tools.length > 0 ? convertToolsToAISDK(tools) : undefined,
            });

            // Stream text chunks
            for await (const chunk of (await result).textStream) {
              if (chunk) {
                controller.enqueue(sse.encodeText(chunk));
              }
            }

            // Get tool calls from the result
            const finalResult = await result;
            const toolCalls = (await finalResult.toolCalls) || [];

            for (const toolCall of toolCalls) {
              controller.enqueue(
                sse.encodeTool(toolCall.toolName, toolCall.args as Record<string, unknown>)
              );
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

      return new Response(stream, {
        headers: getSSEHeaders(),
      });
    } catch (error) {
      console.error('Chat API error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
