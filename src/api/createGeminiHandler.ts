/**
 * Gemini-specific handler using @google/genai directly
 * No Vercel AI SDK required!
 */

import type { ToolDefinition } from '../tools/types';
import { createSSEEncoder, getSSEHeaders } from './streaming';

export interface GeminiHandlerConfig {
  /** Google AI API key (or set GOOGLE_GENERATIVE_AI_API_KEY env var) */
  apiKey?: string;
  /** Gemini model to use (default: gemini-2.0-flash) */
  model?: string;
  /** System prompt for the AI */
  systemPrompt: string;
  /** Tool definitions for the AI */
  tools?: ToolDefinition[];
  /** Temperature for response generation (0-1) */
  temperature?: number;
}

interface RequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Convert tool definitions to Gemini function declaration format
 * Uses 'as unknown' to handle SDK type differences across versions
 */
function convertToolsToGemini(tools: ToolDefinition[]): unknown[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(tool.parameters.properties).map(([key, value]) => [
          key,
          {
            type: value.type,
            description: value.description,
            enum: value.enum,
          },
        ])
      ),
      required: tool.parameters.required,
    },
  }));
}

/**
 * Create a Next.js API route handler for Gemini
 *
 * Uses @google/genai directly - no Vercel AI SDK required!
 * Works with Gemini 2.0+ models.
 *
 * @example
 * ```ts
 * // app/api/chat/route.ts
 * import { createGeminiHandler } from 'ai-site-pilot/api';
 *
 * export const POST = createGeminiHandler({
 *   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
 *   model: 'gemini-2.0-flash',
 *   systemPrompt: 'You are a helpful assistant...',
 *   tools: myTools,
 * });
 * ```
 */
export function createGeminiHandler(config: GeminiHandlerConfig) {
  const {
    apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    model = 'gemini-2.0-flash',
    systemPrompt,
    tools = [],
    temperature = 0.7,
  } = config;

  return async function POST(req: Request): Promise<Response> {
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google AI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Dynamic import to avoid bundling issues
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const body = (await req.json()) as RequestBody;
      const { messages } = body;

      // Convert messages to Gemini format
      const geminiMessages = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }],
      }));

      const sse = createSSEEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const response = await ai.models.generateContentStream({
              model,
              contents: geminiMessages,
              config: {
                systemInstruction: systemPrompt,
                temperature,
                tools: tools.length > 0 ? [{
                  functionDeclarations: convertToolsToGemini(tools),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }] as any : undefined,
              },
            });

            for await (const chunk of response) {
              const parts = chunk.candidates?.[0]?.content?.parts || [];

              for (const part of parts) {
                // Handle text chunks
                if ('text' in part && part.text) {
                  controller.enqueue(sse.encodeText(part.text));
                }

                // Handle function calls
                if ('functionCall' in part && part.functionCall) {
                  controller.enqueue(
                    sse.encodeTool(
                      part.functionCall.name as string,
                      part.functionCall.args as Record<string, unknown>
                    )
                  );
                }
              }
            }

            controller.enqueue(sse.encodeDone());
            controller.close();
          } catch (error) {
            console.error('Gemini streaming error:', error);
            controller.enqueue(sse.encodeError('An error occurred during streaming'));
            controller.close();
          }
        },
      });

      return new Response(stream, { headers: getSSEHeaders() });
    } catch (error) {
      console.error('Gemini handler error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}
