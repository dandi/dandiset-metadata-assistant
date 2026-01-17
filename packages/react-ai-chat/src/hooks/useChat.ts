/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState, useMemo, useRef } from "react";
import {
  Chat,
  ChatMessage,
  Tool,
  ToolContext,
  CompletionFunction,
  ModelConfig,
} from "../types";
import { parseSuggestions } from "../utils/parseSuggestions";

export type ChatAction =
  | { type: "add_message"; message: ChatMessage }
  | { type: "set_model"; model: string }
  | {
      type: "increment_usage";
      usage: {
        promptTokens: number;
        completionTokens: number;
        estimatedCost: number;
      };
    }
  | { type: "clear" }
  | { type: "revert_to_index"; index: number }
  | {
      type: "replace_with_summary";
      message: ChatMessage;
      preservedUsage: Chat["totalUsage"];
    };

const createEmptyChat = (model: string): Chat => ({
  messages: [],
  totalUsage: {
    promptTokens: 0,
    completionTokens: 0,
    estimatedCost: 0,
  },
  model,
});

const chatReducer = (state: Chat, action: ChatAction): Chat => {
  switch (action.type) {
    case "add_message":
      return {
        ...state,
        messages: [...state.messages, action.message],
      };
    case "set_model":
      return {
        ...state,
        model: action.model,
      };
    case "increment_usage":
      return {
        ...state,
        totalUsage: {
          promptTokens:
            state.totalUsage.promptTokens + action.usage.promptTokens,
          completionTokens:
            state.totalUsage.completionTokens + action.usage.completionTokens,
          estimatedCost:
            state.totalUsage.estimatedCost + action.usage.estimatedCost,
        },
      };
    case "clear":
      return createEmptyChat(state.model);
    case "revert_to_index":
      return {
        ...state,
        messages: state.messages.slice(0, action.index + 1),
      };
    case "replace_with_summary":
      return {
        ...state,
        messages: [action.message],
        totalUsage: action.preservedUsage,
      };
    default:
      return state;
  }
};

export interface UseChatOptions {
  /** The completion function to call for LLM responses */
  onCompletion: CompletionFunction;
  /** Custom tools available to the assistant */
  tools?: Tool[];
  /** Context passed to tool execution */
  toolContext?: ToolContext;
  /** System prompt */
  systemPrompt?: string;
  /** Default model */
  defaultModel?: string;
  /** Available models for cost calculation */
  availableModels?: ModelConfig[];
}

/**
 * Convert conversation messages to plain text for summarization
 */
const convertConversationToPlainText = (messages: ChatMessage[]): string => {
  const lines: string[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      lines.push("USER:");
      lines.push(
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content)
      );
      lines.push("");
    } else if (msg.role === "assistant") {
      lines.push("ASSISTANT:");
      if (msg.content) {
        lines.push(
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content)
        );
      }
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          lines.push(`[Tool Call: ${tc.function.name}]`);
          lines.push(tc.function.arguments);
        }
      }
      lines.push("");
    } else if (msg.role === "tool") {
      lines.push(`TOOL RESULT (${msg.name || msg.tool_call_id}):`);
      lines.push(msg.content);
      lines.push("");
    }
  }

  return lines.join("\n");
};

const useChat = (options: UseChatOptions) => {
  const {
    onCompletion,
    tools = [],
    toolContext = {},
    systemPrompt = "",
    defaultModel = "default",
    availableModels = [],
  } = options;

  const [chat, setChat] = useState<Chat>(() => {
    const emptyChat = createEmptyChat(defaultModel);
    return emptyChat;
  });

  const [responding, setResponding] = useState<boolean>(false);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [partialResponse, setPartialResponse] = useState<ChatMessage[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper function to get estimated cost for a model
  const getEstimatedCostForModel = useCallback(
    (model: string, promptToks: number, completionToks: number): number => {
      for (const m of availableModels) {
        if (m.model === model) {
          return (
            (m.cost.prompt * promptToks + m.cost.completion * completionToks) /
            1_000_000
          );
        }
      }
      return 0;
    },
    [availableModels]
  );

  const processToolCalls = useCallback(
    async (
      toolCalls: NonNullable<
        Extract<ChatMessage, { role: "assistant" }>["tool_calls"]
      >,
      signal?: AbortSignal
    ): Promise<ChatMessage[]> => {
      const results: ChatMessage[] = [];

      for (const toolCall of toolCalls) {
        if (signal?.aborted) break;

        const toolCallId = toolCall.id;
        const functionName = toolCall.function.name;
        const functionArgs = toolCall.function.arguments;
        const functionArgsParsed = JSON.parse(functionArgs || "{}");

        const tool = tools.find((t) => t.toolFunction.name === functionName);
        if (!tool) {
          results.push({
            role: "tool",
            content: `Error: Tool not found: ${functionName}`,
            tool_call_id: toolCallId,
          });
          continue;
        }

        try {
          const { result, newMessages } = await tool.execute(
            functionArgsParsed,
            toolContext
          );

          if (newMessages) {
            results.push(...newMessages);
          }
          results.push({
            role: "tool",
            content: result,
            tool_call_id: toolCallId,
            name: functionName,
          });
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          results.push({
            role: "tool",
            content: `Error executing tool "${functionName}": ${errorMessage}`,
            tool_call_id: toolCallId,
          });
        }
      }

      return results;
    },
    [tools, toolContext]
  );

  const generateResponse = useCallback(
    async (currentChat: Chat) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setResponding(true);
      setPartialResponse(null);
      setError(null);

      let partialResponseLocal: ChatMessage[] = [];

      try {
        const request = {
          model: currentChat.model,
          systemMessage: systemPrompt,
          messages: currentChat.messages,
          tools: tools.map((tool) => ({
            type: "function" as const,
            function: tool.toolFunction,
          })),
        };

        const onPartialContent = (content: string) => {
          const partialMessage: ChatMessage = {
            role: "assistant",
            content,
            model: currentChat.model,
            usage: { promptTokens: 0, completionTokens: 0, estimatedCost: 0 },
          };
          partialResponseLocal = [partialMessage];
          setPartialResponse([partialMessage]);
        };

        const response = await onCompletion(
          request,
          onPartialContent,
          abortController.signal
        );

        const ret: ChatMessage[] = [];

        // If there are tool calls, process them
        if (response.toolCalls && response.toolCalls.length > 0) {
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: response.content,
            tool_calls: response.toolCalls,
            model: currentChat.model,
            usage: {
              promptTokens: response.usage?.promptTokens || 0,
              completionTokens: 0,
              estimatedCost: 0,
            },
          };
          ret.push(assistantMessage);
          setPartialResponse([...ret]);

          // Execute tools
          const toolResults = await processToolCalls(
            response.toolCalls,
            abortController.signal
          );
          ret.push(...toolResults);
          setPartialResponse([...ret]);

          // Recurse to get assistant's response to tool results
          let updatedChat = currentChat;
          for (const msg of ret) {
            updatedChat = chatReducer(updatedChat, {
              type: "add_message",
              message: msg,
            });
          }

          const onPartialResponse2 = (messages: ChatMessage[]) => {
            setPartialResponse([...ret, ...messages]);
          };

          // Recursive call
          const recursiveResponse = await generateResponseInternal(
            updatedChat,
            onPartialResponse2,
            abortController.signal
          );

          ret.push(...recursiveResponse);

          // Update chat state with all new messages
          let finalChat = currentChat;
          for (const msg of ret) {
            finalChat = chatReducer(finalChat, {
              type: "add_message",
              message: msg,
            });
            if (msg.role === "assistant" && msg.usage) {
              finalChat = chatReducer(finalChat, {
                type: "increment_usage",
                usage: msg.usage,
              });
            }
          }
          setChat(finalChat);
        } else {
          // No tool calls, just content
          const estimatedCost = getEstimatedCostForModel(
            currentChat.model,
            response.usage?.promptTokens || 0,
            response.usage?.completionTokens || 0
          );

          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: response.content,
            model: currentChat.model,
            usage: {
              promptTokens: response.usage?.promptTokens || 0,
              completionTokens: response.usage?.completionTokens || 0,
              estimatedCost,
            },
          };
          ret.push(assistantMessage);

          let updatedChat = currentChat;
          for (const msg of ret) {
            updatedChat = chatReducer(updatedChat, {
              type: "add_message",
              message: msg,
            });
            if (msg.role === "assistant" && msg.usage) {
              updatedChat = chatReducer(updatedChat, {
                type: "increment_usage",
                usage: msg.usage,
              });
            }
          }
          setChat(updatedChat);
        }

        setPartialResponse(null);
        setResponding(false);
      } catch (err) {
        // Handle errors
        let updatedChat = currentChat;
        for (const msg of partialResponseLocal) {
          updatedChat = chatReducer(updatedChat, {
            type: "add_message",
            message: msg,
          });
        }

        const errorMessage: ChatMessage = {
          role: "assistant",
          content:
            err instanceof Error
              ? err.name === "AbortError"
                ? "Request aborted"
                : `Error: ${err.message}`
              : "Error occurred",
        };
        updatedChat = chatReducer(updatedChat, {
          type: "add_message",
          message: errorMessage,
        });
        setChat(updatedChat);

        if (err instanceof Error && err.name === "AbortError") {
          setPartialResponse(null);
          setResponding(false);
          return;
        }

        console.error("Error generating response:", err);
        setError(
          err instanceof Error
            ? `Error generating response: ${err.message}`
            : "Error generating response"
        );
        setPartialResponse(null);
        setResponding(false);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [
      onCompletion,
      tools,
      systemPrompt,
      processToolCalls,
      getEstimatedCostForModel,
    ]
  );

  // Internal version for recursive calls
  const generateResponseInternal = useCallback(
    async (
      currentChat: Chat,
      onPartialResponse: (messages: ChatMessage[]) => void,
      signal?: AbortSignal
    ): Promise<ChatMessage[]> => {
      const request = {
        model: currentChat.model,
        systemMessage: systemPrompt,
        messages: currentChat.messages,
        tools: tools.map((tool) => ({
          type: "function" as const,
          function: tool.toolFunction,
        })),
      };

      let partialContent = "";
      const onPartialContentInternal = (content: string) => {
        partialContent = content;
        onPartialResponse([
          {
            role: "assistant",
            content,
            model: currentChat.model,
          },
        ]);
      };

      const response = await onCompletion(request, onPartialContentInternal, signal);
      const ret: ChatMessage[] = [];

      if (response.toolCalls && response.toolCalls.length > 0) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.content,
          tool_calls: response.toolCalls,
          model: currentChat.model,
          usage: {
            promptTokens: response.usage?.promptTokens || 0,
            completionTokens: 0,
            estimatedCost: 0,
          },
        };
        ret.push(assistantMessage);
        onPartialResponse([...ret]);

        const toolResults = await processToolCalls(response.toolCalls, signal);
        ret.push(...toolResults);
        onPartialResponse([...ret]);

        let updatedChat = currentChat;
        for (const msg of ret) {
          updatedChat = chatReducer(updatedChat, {
            type: "add_message",
            message: msg,
          });
        }

        const onPartialResponse2 = (messages: ChatMessage[]) => {
          onPartialResponse([...ret, ...messages]);
        };

        const recursiveResponse = await generateResponseInternal(
          updatedChat,
          onPartialResponse2,
          signal
        );
        ret.push(...recursiveResponse);
      } else {
        const estimatedCost = getEstimatedCostForModel(
          currentChat.model,
          response.usage?.promptTokens || 0,
          response.usage?.completionTokens || 0
        );

        ret.push({
          role: "assistant",
          content: response.content || partialContent,
          model: currentChat.model,
          usage: {
            promptTokens: response.usage?.promptTokens || 0,
            completionTokens: response.usage?.completionTokens || 0,
            estimatedCost,
          },
        });
      }

      return ret;
    },
    [onCompletion, tools, systemPrompt, processToolCalls, getEstimatedCostForModel]
  );

  const submitUserMessage = useCallback(
    async (content: string) => {
      try {
        const userMessage: ChatMessage = { role: "user", content };
        const updatedChat = chatReducer(chat, {
          type: "add_message",
          message: userMessage,
        });
        setChat(updatedChat);
        await generateResponse(updatedChat);
      } catch (err) {
        setError(
          err instanceof Error
            ? `Error submitting message: ${err.message}`
            : "Error submitting message"
        );
      }
    },
    [chat, generateResponse]
  );

  const setChatModel = useCallback((newModel: string) => {
    setChat((prev) =>
      chatReducer(prev, { type: "set_model", model: newModel })
    );
  }, []);

  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setChat(createEmptyChat(chat.model));
    setError(null);
    setPartialResponse(null);
    setResponding(false);
  }, [chat.model]);

  const abortResponse = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const revertToMessage = useCallback((messageIndex: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setChat((prev) =>
      chatReducer(prev, { type: "revert_to_index", index: messageIndex })
    );
    setError(null);
    setPartialResponse(null);
    setResponding(false);
  }, []);

  const compressConversation = useCallback(async () => {
    if (chat.messages.length === 0) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setCompressing(true);
    setError(null);

    try {
      const plainTextConversation = convertConversationToPlainText(
        chat.messages
      );

      const summarizationPrompt = `Create a thorough summary of the following conversation that preserves all essential context, including:
- All changes that were proposed or discussed
- Key questions asked and answers provided
- Tool usage and results
- Important decisions or recommendations
- Any context needed for continuing to assist

Here is the full conversation:

${plainTextConversation}`;

      const request = {
        model: chat.model,
        systemMessage: systemPrompt,
        messages: [{ role: "user" as const, content: summarizationPrompt }],
        tools: [],
      };

      const response = await onCompletion(
        request,
        () => {},
        abortController.signal
      );

      const estimatedCost = getEstimatedCostForModel(
        chat.model,
        response.usage?.promptTokens || 0,
        response.usage?.completionTokens || 0
      );

      const summaryMessage: ChatMessage = {
        role: "assistant",
        content: response.content,
        model: chat.model,
        usage: {
          promptTokens: response.usage?.promptTokens || 0,
          completionTokens: response.usage?.completionTokens || 0,
          estimatedCost,
        },
      };

      const preservedUsage = {
        promptTokens:
          chat.totalUsage.promptTokens + (response.usage?.promptTokens || 0),
        completionTokens:
          chat.totalUsage.completionTokens +
          (response.usage?.completionTokens || 0),
        estimatedCost: chat.totalUsage.estimatedCost + estimatedCost,
      };

      setChat((prev) =>
        chatReducer(prev, {
          type: "replace_with_summary",
          message: summaryMessage,
          preservedUsage,
        })
      );

      setCompressing(false);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setCompressing(false);
        return;
      }
      console.error("Error compressing conversation:", err);
      setError(
        err instanceof Error
          ? `Error compressing conversation: ${err.message}`
          : "Error compressing conversation"
      );
      setCompressing(false);
    } finally {
      abortControllerRef.current = null;
    }
  }, [chat, systemPrompt, onCompletion, getEstimatedCostForModel]);

  // Get current suggestions from last assistant message
  const currentSuggestions = useMemo(() => {
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      const msg = chat.messages[i];
      if (msg.role === "assistant" && msg.content) {
        const content = typeof msg.content === "string" ? msg.content : "";
        const { suggestions } = parseSuggestions(content);
        if (suggestions.length > 0) {
          return suggestions;
        }
        return [];
      }
    }
    return [];
  }, [chat.messages]);

  return {
    chat,
    submitUserMessage,
    responding,
    compressing,
    partialResponse,
    setChatModel,
    error,
    clearChat,
    abortResponse,
    revertToMessage,
    compressConversation,
    currentSuggestions,
  };
};

export default useChat;
