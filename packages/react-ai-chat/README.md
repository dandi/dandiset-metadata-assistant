# react-ai-chat

A reusable React chat component for AI assistants with support for custom tools, streaming responses, and Material-UI styling.

## Features

- 🤖 **AI Chat Interface** - Beautiful chat UI with user/assistant message styling
- 🔧 **Custom Tools** - Define custom tools that the AI can call
- 📡 **Streaming Support** - Built-in support for streaming responses
- 📱 **Responsive Design** - Works on desktop and mobile
- 🎨 **Material-UI** - Customizable with MUI theming
- 📝 **Markdown** - Full markdown rendering with syntax highlighting
- 🗜️ **Compression** - Compress long conversations to save tokens
- 💡 **Suggestions** - AI-generated follow-up suggestions
- 📥 **Export** - Download chat history

## Installation

```bash
npm install react-ai-chat
# or
yarn add react-ai-chat
```

### Peer Dependencies

This package requires the following peer dependencies:

```bash
npm install react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled
```

## Quick Start

```tsx
import { ChatPanel, CompletionFunction, Tool } from 'react-ai-chat';

// Define your completion function (connects to your LLM API)
const handleCompletion: CompletionFunction = async (request, onPartialContent, signal) => {
  const response = await fetch('https://your-api-endpoint.com/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  const reader = response.body?.getReader();
  let content = '';
  
  // Handle streaming response
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = new TextDecoder().decode(value);
    content += chunk;
    onPartialContent(content);
  }

  return { content };
};

// Define optional custom tools
const tools: Tool[] = [
  {
    toolFunction: {
      name: 'calculate',
      description: 'Perform a calculation',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Math expression to evaluate' }
        },
        required: ['expression']
      }
    },
    execute: async (params) => {
      const result = eval(params.expression);
      return { result: `Result: ${result}` };
    },
    getDetailedDescription: () => 'Use this to calculate mathematical expressions.'
  }
];

function App() {
  return (
    <ChatPanel
      onCompletion={handleCompletion}
      tools={tools}
      systemPrompt="You are a helpful assistant."
      title="My AI Assistant"
    />
  );
}
```

## API Reference

### `<ChatPanel>`

Main chat component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onCompletion` | `CompletionFunction` | **required** | Function to call the LLM API |
| `tools` | `Tool[]` | `[]` | Custom tools for the assistant |
| `toolContext` | `ToolContext` | `{}` | Context passed to tool execution |
| `systemPrompt` | `string` | `""` | System prompt for the LLM |
| `availableModels` | `ModelConfig[]` | `[]` | Models available for selection |
| `defaultModel` | `string` | First model or "default" | Default model to use |
| `title` | `string` | `"Assistant"` | Title in the header |
| `placeholder` | `string` | `"Type your message..."` | Input placeholder |
| `emptyStateContent` | `ReactNode` | Default message | Custom empty state |
| `enableSuggestions` | `boolean` | `true` | Show suggestion chips |
| `enableCompression` | `boolean` | `true` | Enable conversation compression |
| `enableExport` | `boolean` | `true` | Enable chat export |
| `enableModelSelection` | `boolean` | `true` | Show model selector |
| `onMessageSent` | `(message: string) => void` | - | Callback when user sends message |
| `onError` | `(error: Error) => void` | - | Error callback |
| `onChatCleared` | `() => void` | - | Callback when chat is cleared |
| `onModelChange` | `(model: string) => void` | - | Model change callback |
| `isLoading` | `boolean` | `false` | Show loading state |

### `CompletionFunction`

The function you provide to handle LLM API calls.

```typescript
type CompletionFunction = (
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
```

### `Tool`

Define custom tools for the assistant.

```typescript
interface Tool {
  toolFunction: {
    name: string;
    description?: string;
    parameters: object; // JSON Schema
  };
  execute: (
    params: unknown,
    context: ToolContext
  ) => Promise<{ result: string; newMessages?: ChatMessage[] }>;
  getDetailedDescription: () => string;
}
```

### `useChat` Hook

For advanced use cases, you can use the chat hook directly:

```typescript
import { useChat } from 'react-ai-chat';

const {
  chat,              // Current chat state
  submitUserMessage, // Submit a message
  responding,        // Is the AI responding?
  compressing,       // Is compression in progress?
  partialResponse,   // Partial response while streaming
  setChatModel,      // Change the model
  error,             // Error message
  clearChat,         // Clear all messages
  abortResponse,     // Cancel current response
  revertToMessage,   // Revert to a previous message
  compressConversation, // Compress the conversation
  currentSuggestions,   // Current suggestion list
} = useChat({
  onCompletion,
  tools,
  toolContext,
  systemPrompt,
  defaultModel,
  availableModels
});
```

## Suggestions

The assistant can include suggested follow-up prompts. Add a line to your assistant's response:

```
suggestions: Ask about X, Tell me more, How do I Y
```

These will appear as clickable chips above the input.

## Theming

The component uses Material-UI, so you can customize it with your theme:

```tsx
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
  },
});

<ThemeProvider theme={theme}>
  <ChatPanel onCompletion={handleCompletion} />
</ThemeProvider>
```

## OpenRouter Integration Example

Here's an example completion function for OpenRouter:

```typescript
const handleCompletion: CompletionFunction = async (request, onPartialContent, signal) => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${YOUR_API_KEY}`,
    },
    body: JSON.stringify({
      model: request.model,
      messages: [
        { role: 'system', content: request.systemMessage },
        ...request.messages,
      ],
      tools: request.tools.length > 0 ? request.tools : undefined,
      stream: true,
    }),
    signal,
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let content = '';
  let toolCalls: ToolCall[] = [];
  let usage = { promptTokens: 0, completionTokens: 0 };

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        
        if (delta?.content) {
          content += delta.content;
          onPartialContent(content);
        }
        
        if (delta?.tool_calls) {
          // Handle tool calls
          toolCalls = delta.tool_calls;
        }
        
        if (parsed.usage) {
          usage = {
            promptTokens: parsed.usage.prompt_tokens,
            completionTokens: parsed.usage.completion_tokens,
          };
        }
      }
    }
  }

  return { content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined, usage };
};
```

## License

MIT
