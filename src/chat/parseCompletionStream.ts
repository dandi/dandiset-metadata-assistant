/* eslint-disable @typescript-eslint/no-explicit-any */
import { ORResponse, ORToolCall } from "./openRouterTypes";

export interface StreamParseResult {
  assistantContent: string;
  toolCalls: ORToolCall[] | undefined;
  promptTokens: number;
  completionTokens: number;
}

export const parseCompletionStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunkProcessed?: (assistantContent: string) => void,
): Promise<StreamParseResult> => {
  let done = false;
  let assistantContent = "";
  let toolCalls: ORToolCall[] | undefined = undefined;

  let promptTokens = 0;
  let completionTokens = 0;
  let buffer = "";

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      const chunk = new TextDecoder("utf-8").decode(value);
      const combined = buffer + chunk;
      const lines = combined.split("\n");

      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "") continue;
        if (line.startsWith("data: ")) {
          const data = line.replace("data: ", "").trim();
          if (data === "[DONE]") {
            done = true;
            break;
          }
          try {
            let parsed;
            try {
              parsed = JSON.parse(data) as ORResponse;
            } catch (e) {
              console.warn(data);
              throw e;
            }
            const choice = parsed.choices[0];
            if (choice && "delta" in choice) {
              const delta = choice.delta;
              if (delta.content) {
                assistantContent += delta.content;
                if (onChunkProcessed) {
                  onChunkProcessed(assistantContent);
                }
              }
              if (delta.tool_calls) {
                toolCalls = applyDeltaToToolCalls(toolCalls, delta.tool_calls);
              }
            }
            if (parsed.usage) {
              promptTokens += parsed.usage.prompt_tokens || 0;
              completionTokens += parsed.usage.completion_tokens || 0;
            }
          } catch (e) {
            console.error("Error parsing chunk:", e);
          }
        }
      }
    }
  }

  // Process any remaining buffered content
  if (buffer.trim() !== "") {
    const line = buffer.trim();
    if (line.startsWith("data: ")) {
      const data = line.replace("data: ", "").trim();
      if (data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data) as ORResponse;
          const choice = parsed.choices[0];
          if (choice && "delta" in choice) {
            const delta = choice.delta;
            if (delta.content) {
              assistantContent += delta.content;
              if (onChunkProcessed) {
                onChunkProcessed(assistantContent);
              }
            }
            if (delta.tool_calls) {
              toolCalls = applyDeltaToToolCalls(toolCalls, delta.tool_calls);
            }
          }
          if (parsed.usage) {
            promptTokens += parsed.usage.prompt_tokens || 0;
            completionTokens += parsed.usage.completion_tokens || 0;
          }
        } catch (e) {
          console.error("Error parsing buffered line:", e);
        }
      }
    }
  }

  return {
    assistantContent,
    toolCalls,
    promptTokens,
    completionTokens,
  };
};

export const applyDeltaToToolCalls = (
  current: ORToolCall[] | undefined,
  delta: any[],
): ORToolCall[] => {
  if (!current) {
    current = [];
  }

  for (const deltaToolCall of delta) {
    const index = deltaToolCall.index;

    if (index >= current.length) {
      current.push({
        id: deltaToolCall.id || "",
        type: deltaToolCall.type,
        function: {
          name: deltaToolCall.function.name || "",
          arguments: deltaToolCall.function.arguments || "",
        },
      });
    } else {
      const existingToolCall = current[index];

      if (deltaToolCall.id) {
        existingToolCall.id = deltaToolCall.id;
      }

      if (deltaToolCall.function.name) {
        existingToolCall.function.name = deltaToolCall.function.name;
      }

      if (deltaToolCall.function.arguments) {
        existingToolCall.function.arguments += deltaToolCall.function.arguments;
      }
    }
  }

  return current;
};
