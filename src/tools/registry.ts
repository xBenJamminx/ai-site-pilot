/**
 * Tool registry for managing and converting tool definitions
 */

import type { ToolDefinition, ToolParameters, ToolExecution } from './types';

/**
 * Generate a smart message from tool name and args when no custom generator exists
 */
function generateSmartMessage(name: string, args: Record<string, unknown>): string {
  const argValues = Object.values(args);
  const primaryArg = argValues[0];
  const argStr = primaryArg && typeof primaryArg === 'string' ? ` **${primaryArg}**` : '';

  if (name.includes('navigate') || name.includes('scroll')) {
    return `Navigated to${argStr}.`;
  }
  if (name.includes('filter')) {
    return `Filtered by${argStr}.`;
  }
  if (name.includes('show') || name.includes('open') || name.includes('display')) {
    return `Showing${argStr}.`;
  }
  if (name.includes('search')) {
    return `Searched for${argStr}.`;
  }
  if (name.includes('select') || name.includes('highlight')) {
    return `Selected${argStr}.`;
  }

  // Convert tool name to readable format
  const readable = name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return argStr ? `${readable}:${argStr}.` : `${readable}.`;
}

/**
 * Helper to create a fallback message generator based on tool name mappings
 *
 * @example
 * ```ts
 * const generateFallback = createFallbackMessageGenerator({
 *   filter_by_category: (args) => `Filtered to show **${args.category}** projects.`,
 *   open_project: (args) => `Opened **${args.projectId}** for you to explore.`,
 *   navigate: (args) => `Scrolled to the **${args.section}** section.`,
 * });
 * ```
 */
export function createFallbackMessageGenerator(
  toolMessages: Record<string, (args: Record<string, unknown>) => string>
): (toolCalls: ToolExecution[]) => string {
  return (toolCalls: ToolExecution[]) => {
    if (toolCalls.length === 0) return '';

    const messages: string[] = [];

    for (const tool of toolCalls) {
      const generator = toolMessages[tool.name];
      if (generator) {
        messages.push(generator(tool.args));
      } else {
        // Use smart generation instead of generic message
        messages.push(generateSmartMessage(tool.name, tool.args));
      }
    }

    return messages.join(' ');
  };
}

/**
 * Helper function to define a tool with type safety
 */
export function defineTool<TParams extends Record<string, unknown>>(
  config: ToolDefinition<TParams>
): ToolDefinition<TParams> {
  return config;
}

/**
 * Create a simple tool with no parameters
 */
export function defineSimpleTool(
  name: string,
  description: string,
  handler?: () => void | Promise<void>
): ToolDefinition {
  return {
    name,
    description,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler,
  };
}

/**
 * Tool registry for managing multiple tools
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor(tools: ToolDefinition[] = []) {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Register a tool
   */
  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): void {
    this.tools.delete(name);
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool by name with given arguments
   */
  async execute(execution: ToolExecution): Promise<void> {
    const tool = this.tools.get(execution.name);
    if (!tool) {
      console.warn(`Tool not found: ${execution.name}`);
      return;
    }
    if (tool.handler) {
      await tool.handler(execution.args);
    }
  }

  /**
   * Execute multiple tools in sequence
   */
  async executeAll(executions: ToolExecution[], delayMs = 300): Promise<void> {
    for (const execution of executions) {
      await this.execute(execution);
      if (delayMs > 0 && executions.indexOf(execution) < executions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Convert to Vercel AI SDK tool format
   */
  toVercelAITools(): Record<string, { description: string; parameters: unknown }> {
    const result: Record<string, { description: string; parameters: unknown }> = {};

    for (const tool of this.tools.values()) {
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
   * Convert to Gemini function declarations format
   */
  toGeminiFunctionDeclarations(): Array<{
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  }> {
    return this.getAll().map(tool => ({
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
              enum: value.enum,
            },
          ])
        ),
        required: tool.parameters.required,
      },
    }));
  }
}

/**
 * Create a tool registry from an array of tools
 */
export function createToolRegistry(tools: ToolDefinition[]): ToolRegistry {
  return new ToolRegistry(tools);
}
