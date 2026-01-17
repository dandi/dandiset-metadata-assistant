/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Function call within a tool call
 */
export interface FunctionCall {
  name: string;
  arguments: string; // JSON format arguments
}

/**
 * Tool call from the assistant
 */
export interface ToolCall {
  id: string;
  type: "function";
  function: FunctionCall;
}

/**
 * Text content part
 */
export interface TextContent {
  type: "text";
  text: string;
}

/**
 * Image content part
 */
export interface ImageContent {
  type: "image_url";
  image_url: {
    url: string;
    detail?: string;
  };
}

/**
 * Content parts for multimodal messages
 */
export type ContentPart = TextContent | ImageContent;

/**
 * Usage/token statistics for a message
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
}

/**
 * Chat message types - user, assistant, or tool
 */
export type ChatMessage =
  | {
      role: "user";
      content: string | ContentPart[];
    }
  | {
      role: "assistant";
      content: string | ContentPart[] | null;
      tool_calls?: ToolCall[];
      model?: string;
      usage?: TokenUsage;
    }
  | {
      role: "tool";
      content: string;
      tool_call_id: string;
      name?: string;
    };

/**
 * Chat state including messages and usage statistics
 */
export interface Chat {
  messages: ChatMessage[];
  totalUsage: TokenUsage;
  model: string;
}

/**
 * Tool function description for LLM
 */
export interface ToolFunctionDescription {
  description?: string;
  name: string;
  parameters: object; // JSON Schema object
}

/**
 * Tool definition for LLM
 */
export interface ToolDefinition {
  type: "function";
  function: ToolFunctionDescription;
}

/**
 * Context passed to tool execution
 */
export interface ToolContext {
  [key: string]: unknown;
}

/**
 * Tool interface for defining custom tools
 */
export interface Tool {
  /** Tool function description for LLM */
  toolFunction: ToolFunctionDescription;

  /**
   * Execute the tool with the given parameters
   * @param params Parsed JSON parameters from LLM
   * @param context Application-provided context
   * @returns Result string and optional additional messages
   */
  execute: (
    params: any,
    context: ToolContext
  ) => Promise<{ result: string; newMessages?: ChatMessage[] }>;

  /**
   * Get detailed description for system prompt
   */
  getDetailedDescription: () => string;
}

/**
 * Completion request to send to LLM
 */
export interface CompletionRequest {
  model: string;
  systemMessage: string;
  messages: ChatMessage[];
  tools: ToolDefinition[];
}

/**
 * Chunk from streaming completion response
 */
export interface CompletionChunk {
  type: "content" | "tool_call" | "usage" | "done";
  content?: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * Model configuration
 */
export interface ModelConfig {
  /** Model identifier (e.g., "openai/gpt-4o") */
  model: string;
  /** Display label */
  label: string;
  /** Cost per million tokens */
  cost: {
    prompt: number;
    completion: number;
  };
}

/**
 * Completion function type that the application provides
 */
export type CompletionFunction = (
  request: CompletionRequest,
  onPartialContent: (content: string) => void,
  signal?: AbortSignal
) => Promise<{
  content: string | null;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}>;

/**
 * Chat panel props
 */
export interface ChatPanelProps {
  /**
   * Completion function to call the LLM API
   * The application provides this to handle API authentication and streaming
   */
  onCompletion: CompletionFunction;

  /**
   * Custom tools available to the assistant
   */
  tools?: Tool[];

  /**
   * Context object passed to tool execution
   */
  toolContext?: ToolContext;

  /**
   * System prompt to send to the LLM
   */
  systemPrompt?: string;

  /**
   * Available models for selection
   */
  availableModels?: ModelConfig[];

  /**
   * Default model to use
   */
  defaultModel?: string;

  /**
   * List of model identifiers that are "cheap" and don't require API keys
   */
  cheapModels?: string[];

  /**
   * Title displayed in the header
   */
  title?: string;

  /**
   * Placeholder text for the input field
   */
  placeholder?: string;

  /**
   * Custom empty state content when no messages
   */
  emptyStateContent?: React.ReactNode;

  /**
   * Enable inline suggestion chips
   * @default true
   */
  enableSuggestions?: boolean;

  /**
   * Enable conversation compression
   * @default true
   */
  enableCompression?: boolean;

  /**
   * Enable chat export/download
   * @default true
   */
  enableExport?: boolean;

  /**
   * Enable model selection UI
   * @default true
   */
  enableModelSelection?: boolean;

  /**
   * Callback when a user message is sent
   */
  onMessageSent?: (message: string) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;

  /**
   * Callback when chat is cleared
   */
  onChatCleared?: () => void;

  /**
   * Callback when model changes
   */
  onModelChange?: (model: string) => void;

  /**
   * Whether the chat is loading (shows loading indicator)
   */
  isLoading?: boolean;
}

/**
 * Parsed suggestions result
 */
export interface ParsedSuggestions {
  cleanedContent: string;
  suggestions: string[];
}
