/**
 * Chat handler that routes every request through Vercel AI Gateway.
 * No SDK required - just standard fetch.
 */

import type { ToolDefinition } from '../tools/types';
import { createSSEEncoder, getSSEHeaders } from './streaming';
import { generateSystemPrompt, type SiteContent } from './generateSystemPrompt';

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

interface BaseHandlerConfig {
  /** Gateway API key. Defaults to AI_GATEWAY_API_KEY, then VERCEL_OIDC_TOKEN */
  apiKey?: string;
  /** Gateway model ID (e.g., 'openai/gpt-4o', 'anthropic/claude-sonnet-4') */
  model?: string;
  /** Tool definitions for the AI */
  tools?: ToolDefinition[];
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Maximum output tokens */
  maxTokens?: number;
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

interface InternalMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GatewayTool {
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

type SSEEncoder = ReturnType<typeof createSSEEncoder>;

/**
 * Convert tool definitions to the OpenAI-compatible format the gateway accepts
 */
function convertTools(tools: ToolDefinition[]): GatewayTool[] {
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
              ...(value.items && { items: value.items }),
            },
          ])
        ),
        required: tool.parameters.required,
      },
    },
  }));
}

async function streamGatewayResponse(
  controller: ReadableStreamDefaultController,
  sse: SSEEncoder,
  opts: {
    apiKey: string;
    model: string;
    messages: InternalMessage[];
    tools: ToolDefinition[];
    temperature: number;
    maxTokens?: number;
  }
) {
  const { apiKey, model, messages, tools, temperature, maxTokens } = opts;

  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      stream: true,
      ...(maxTokens && { max_tokens: maxTokens }),
      ...(tools.length > 0 && { tools: convertTools(tools) }),
    }),
  });

  if (!response.ok) {
    // Log status only: upstream error bodies can echo request details
    console.error(`AI Gateway error: HTTP ${response.status}`);
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
  const pendingToolCalls = new Map<number, { name: string; arguments: string }>();

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

          if (delta?.content) {
            controller.enqueue(sse.encodeText(delta.content));
          }

          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              const index = toolCall.index ?? 0;
              let pending = pendingToolCalls.get(index);
              if (!pending) {
                pending = { name: '', arguments: '' };
                pendingToolCalls.set(index, pending);
              }
              if (toolCall.function?.name) {
                pending.name = toolCall.function.name;
              }
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

  for (const [, toolCall] of pendingToolCalls) {
    // No-argument tools may stream an empty arguments string
    if (toolCall.name) {
      try {
        const args = JSON.parse(toolCall.arguments || '{}');
        controller.enqueue(sse.encodeTool(toolCall.name, args));
      } catch (e) {
        console.error('Failed to parse tool arguments:', toolCall.arguments, e);
      }
    }
  }

  controller.enqueue(sse.encodeDone());
  controller.close();
}

/**
 * Create a Next.js API route handler backed by Vercel AI Gateway
 *
 * Auth comes from AI_GATEWAY_API_KEY, or the Vercel OIDC token when deployed on
 * Vercel (run `vercel env pull` locally to get a fresh token).
 *
 * @example
 * ```ts
 * // app/api/chat/route.ts
 * import { createHandler } from 'ai-site-pilot/api';
 *
 * export const POST = createHandler({
 *   model: 'openai/gpt-4o',
 *   systemPrompt: 'You are a helpful assistant...',
 *   tools: myTools,
 * });
 * ```
 */
export function createHandler(config: HandlerConfig) {
  const {
    maxTokens,
    tools = [],
    temperature = 0.7,
  } = config;

  const model = config.model || 'anthropic/claude-haiku-5.5';

  const systemPrompt = 'siteContent' in config && config.siteContent
    ? generateSystemPrompt(config.siteContent)
    : (config as HandlerConfigWithPrompt).systemPrompt;

  return async function POST(req: Request): Promise<Response> {
    // Read per request: the OIDC token rotates. On Vercel it arrives as a
    // request header; locally `vercel env pull` provides the env var.
    const apiKey = config.apiKey
      || process.env.AI_GATEWAY_API_KEY
      || req.headers.get('x-vercel-oidc-token')
      || process.env.VERCEL_OIDC_TOKEN;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI Gateway not configured. Set AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const body = (await req.json()) as RequestBody;
      const { messages } = body;

      const allMessages: InternalMessage[] = [
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
            await streamGatewayResponse(controller, sse, {
              apiKey, model, messages: allMessages, tools, temperature, maxTokens,
            });
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
