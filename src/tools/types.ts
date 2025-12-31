/**
 * Tool system types
 */

export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  enum?: string[];
  items?: { type: string };
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameterProperty>;
  required: string[];
}

export interface ToolDefinition<TParams extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique name for the tool */
  name: string;
  /** Description shown to the AI - be specific about when to use it */
  description: string;
  /** Parameter schema */
  parameters: ToolParameters;
  /** Handler function executed when the AI calls this tool */
  handler?: (params: TParams) => void | Promise<void>;
}

export interface ToolExecution {
  name: string;
  args: Record<string, unknown>;
}
