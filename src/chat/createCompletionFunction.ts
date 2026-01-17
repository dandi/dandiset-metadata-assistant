import type { CompletionFunction } from "react-ai-chat";
import { getStoredOpenRouterApiKey } from "./apiKeyStorage";
import { parseCompletionStream } from "./parseCompletionStream";

// Retry configuration for rate limit errors
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 10000; // 10 seconds

/**
 * Sleep for a given number of milliseconds
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if an error is a rate limit error
 */
const isRateLimitError = (status: number, errorMessage: string): boolean => {
  return status === 429 || errorMessage.toLowerCase().includes("rate limit");
};

/**
 * Creates a completion function for the react-ai-chat package
 * that connects to the OpenRouter API via our proxy
 */
export const createCompletionFunction = (): CompletionFunction => {
  return async (request, onPartialContent, signal) => {
    const apiKey = getStoredOpenRouterApiKey();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["x-openrouter-key"] = apiKey;
    }

    // Build request body
    const body = {
      model: request.model,
      systemMessage: request.systemMessage,
      messages: request.messages,
      tools: request.tools.length > 0 ? request.tools : undefined,
      app: "dandiset-metadata-assistant",
    };

    // Fetch with retry logic for rate limit errors
    let response: Response | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await fetch("https://qp-worker.neurosift.app/api/completion", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal,
        });

        if (response.ok) {
          break; // Success, exit retry loop
        }

        // Try to get detailed error message from response body
        let errorDetails = response.statusText || `HTTP ${response.status}`;
        try {
          const errorBody = await response.text();
          if (errorBody) {
            try {
              const errorJson = JSON.parse(errorBody);
              errorDetails = errorJson.error?.message || errorJson.message || errorJson.error || errorBody;
            } catch {
              errorDetails = errorBody;
            }
          }
        } catch {
          // Couldn't read body, stick with statusText
        }

        // Check if this is a rate limit error and we should retry
        if (isRateLimitError(response.status, errorDetails) && attempt < MAX_RETRIES) {
          const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(`Rate limit hit, retrying in ${delayMs / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);

          // Update partial content to show waiting message
          onPartialContent(`⏳ Rate limit reached. Waiting ${Math.round(delayMs / 1000)} seconds before retrying (attempt ${attempt + 1}/${MAX_RETRIES})...`);

          await sleep(delayMs);
          continue; // Retry
        }

        // Not a rate limit error or out of retries
        lastError = new Error(`OpenRouter API error: ${errorDetails}`);
        break;
      } catch (err) {
        // Network error or abort
        if (err instanceof Error && err.name === "AbortError") {
          throw err; // Don't retry aborted requests
        }
        lastError = err instanceof Error ? err : new Error(String(err));

        // Only retry network errors if we have retries left
        if (attempt < MAX_RETRIES) {
          const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(`Network error, retrying in ${delayMs / 1000}s...`);
          await sleep(delayMs);
          continue;
        }
        break;
      }
    }

    if (lastError) {
      throw lastError;
    }

    if (!response || !response.ok) {
      throw new Error("Failed to get response from API");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const { assistantContent, toolCalls, promptTokens, completionTokens } =
      await parseCompletionStream(reader, onPartialContent);

    return {
      content: assistantContent,
      toolCalls: toolCalls || undefined,
      usage: {
        promptTokens,
        completionTokens,
      },
    };
  };
};
