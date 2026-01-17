// Components
export {
  ChatPanel,
  ChatInput,
  MessageItem,
  MarkdownContent,
  SuggestedPrompts,
  CompressConfirmDialog,
  ChatSettingsDialog,
} from "./components";

// Hooks
export { useChat } from "./hooks";
export type { UseChatOptions, ChatAction } from "./hooks";

// Types
export type {
  // Core message types
  ChatMessage,
  Chat,
  TokenUsage,
  ContentPart,
  TextContent,
  ImageContent,
  
  // Tool types
  Tool,
  ToolContext,
  ToolCall,
  ToolDefinition,
  ToolFunctionDescription,
  FunctionCall,
  
  // Completion types
  CompletionFunction,
  CompletionRequest,
  CompletionChunk,
  
  // Model types
  ModelConfig,
  
  // Component props
  ChatPanelProps,
  
  // Utility types
  ParsedSuggestions,
} from "./types";

// Utilities
export {
  parseSuggestions,
  hasSuggestions,
  getStoredOpenRouterApiKey,
  setStoredOpenRouterApiKey,
  clearStoredOpenRouterApiKey,
  maskApiKey,
} from "./utils";
