import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Box,
  CircularProgress,
  Typography,
  IconButton,
  Paper,
  Alert,
  Chip,
  Tooltip,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SettingsIcon from "@mui/icons-material/Settings";
import RefreshIcon from "@mui/icons-material/Refresh";
import StopIcon from "@mui/icons-material/Stop";
import DownloadIcon from "@mui/icons-material/Download";
import CompressIcon from "@mui/icons-material/Compress";
import ChatInput from "./ChatInput";
import MessageItem from "./MessageItem";
import SuggestedPrompts from "./SuggestedPrompts";
import CompressConfirmDialog from "./CompressConfirmDialog";
import ChatSettingsDialog from "./ChatSettingsDialog";
import useChat from "../hooks/useChat";
import { ChatPanelProps } from "../types";

export function ChatPanel({
  onCompletion,
  tools = [],
  toolContext = {},
  systemPrompt = "",
  availableModels = [],
  defaultModel,
  cheapModels = [],
  title = "Assistant",
  placeholder = "Type your message...",
  emptyStateContent,
  enableSuggestions = true,
  enableCompression = true,
  enableExport = true,
  enableModelSelection = true,
  onMessageSent,
  onError,
  onChatCleared,
  onModelChange,
  isLoading = false,
}: ChatPanelProps) {
  const {
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
  } = useChat({
    onCompletion,
    tools,
    toolContext,
    systemPrompt,
    defaultModel: defaultModel || availableModels[0]?.model || "default",
    availableModels,
  });

  const [newPrompt, setNewPrompt] = useState<string>("");
  const [compressDialogOpen, setCompressDialogOpen] = useState<boolean>(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState<boolean>(false);
  const [errorExpanded, setErrorExpanded] = useState<boolean>(false);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Compression threshold (number of messages before suggesting compression)
  const compressionThreshold = 35;

  // Call error callback when error changes
  useEffect(() => {
    if (error && onError) {
      onError(new Error(error));
    }
  }, [error, onError]);

  // All messages including partial response
  const allMessages = useMemo(() => {
    const messages = chat.messages.map((m) => ({
      message: m,
      inProgress: false,
    }));
    if (responding && partialResponse) {
      return [
        ...messages,
        ...partialResponse.map((m) => ({ message: m, inProgress: true })),
      ];
    }
    return messages;
  }, [chat.messages, responding, partialResponse]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [allMessages]);

  const handleSubmit = useCallback(() => {
    if (newPrompt.trim() === "" || responding || compressing) return;
    const message = newPrompt.trim();
    submitUserMessage(message);
    setNewPrompt("");
    onMessageSent?.(message);
  }, [newPrompt, submitUserMessage, responding, compressing, onMessageSent]);

  const handleNewChat = useCallback(() => {
    clearChat();
    setNewPrompt("");
    onChatCleared?.();
  }, [clearChat, onChatCleared]);

  const handleCompressClick = useCallback(() => {
    setCompressDialogOpen(true);
  }, []);

  const handleCompressConfirm = useCallback(async () => {
    setCompressDialogOpen(false);
    await compressConversation();
  }, [compressConversation]);

  const handleCompressCancel = useCallback(() => {
    setCompressDialogOpen(false);
  }, []);

  const handleSettingsClick = useCallback(() => {
    setSettingsDialogOpen(true);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setSettingsDialogOpen(false);
  }, []);

  const handleModelChange = useCallback(
    (model: string) => {
      setChatModel(model);
      onModelChange?.(model);
    },
    [setChatModel, onModelChange]
  );

  const handleDownloadChat = useCallback(() => {
    const lines: string[] = [];
    lines.push(`Chat Export`);
    lines.push(`Model: ${chat.model}`);
    lines.push(`Date: ${new Date().toISOString()}`);
    lines.push(`${"=".repeat(50)}\n`);

    for (const msg of chat.messages) {
      if (msg.role === "user") {
        lines.push(`USER:`);
        lines.push(
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content)
        );
        lines.push("");
      } else if (msg.role === "assistant") {
        lines.push(`ASSISTANT:`);
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

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [chat.messages, chat.model]);

  // Get display label for current model
  const currentModelLabel = useMemo(() => {
    const model = availableModels.find((m) => m.model === chat.model);
    return model?.label || chat.model.split("/").pop() || chat.model;
  }, [availableModels, chat.model]);

  // Default empty state
  const defaultEmptyState = (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        textAlign: "center",
        backgroundColor: "grey.50",
        borderRadius: 2,
        m: "auto",
        maxWidth: 400,
      }}
    >
      <SmartToyIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Ready to Help!
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Start a conversation by typing a message below.
      </Typography>
    </Paper>
  );

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "background.default",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          backgroundColor: "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            userSelect: "none",
          }}
        >
          <SmartToyIcon color="primary" />
          {title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {responding && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={abortResponse}
              sx={{ mr: 1 }}
            >
              Stop
            </Button>
          )}
          {enableModelSelection && availableModels.length > 0 && (
            <Chip
              label={currentModelLabel}
              size="small"
              variant="outlined"
              onClick={handleSettingsClick}
              sx={{ fontSize: "0.7rem", cursor: "pointer" }}
            />
          )}
          {enableCompression && (
            <Tooltip title="Compress Conversation">
              <span>
                <IconButton
                  size="small"
                  onClick={handleCompressClick}
                  disabled={chat.messages.length < 3 || compressing}
                >
                  <CompressIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {enableExport && (
            <Tooltip title="Download Chat">
              <span>
                <IconButton
                  size="small"
                  onClick={handleDownloadChat}
                  disabled={chat.messages.length === 0}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title="New Chat">
            <span>
              <IconButton
                size="small"
                onClick={handleNewChat}
                disabled={chat.messages.length === 0}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {enableModelSelection && availableModels.length > 1 && (
            <Tooltip title="Settings">
              <IconButton size="small" onClick={handleSettingsClick}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Chat Messages Area */}
      <Box
        ref={conversationRef}
        sx={{
          flex: 1,
          overflow: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              m: "auto",
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        ) : allMessages.length === 0 ? (
          emptyStateContent || defaultEmptyState
        ) : (
          <>
            {allMessages.map(({ message, inProgress }, index) => {
              // Find the actual index in chat.messages (excluding partial responses)
              const isFromChat = index < chat.messages.length;
              const chatIndex = isFromChat ? index : -1;
              // Can revert if it's not the last message and not in progress
              const canRevert =
                isFromChat &&
                index < chat.messages.length - 1 &&
                !responding;

              return (
                <MessageItem
                  key={index}
                  message={message}
                  inProgress={inProgress}
                  messageIndex={chatIndex}
                  onRevert={revertToMessage}
                  canRevert={canRevert}
                />
              );
            })}
            {responding && !partialResponse && (
              <Box
                sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    backgroundColor: "grey.100",
                    borderRadius: 2,
                    borderTopLeftRadius: 0,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography
                      variant="body2"
                      sx={{ fontStyle: "italic", color: "text.secondary" }}
                    >
                      Thinking...
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}
            {compressing && (
              <Box
                sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    backgroundColor: "grey.100",
                    borderRadius: 2,
                    borderTopLeftRadius: 0,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography
                      variant="body2"
                      sx={{ fontStyle: "italic", color: "text.secondary" }}
                    >
                      Compressing conversation...
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Error Display */}
      {error && (
        <Alert
          severity="error"
          sx={{ mx: 2, mb: 1 }}
          action={
            error.length > 100 ? (
              <IconButton
                size="small"
                onClick={() => setErrorExpanded(!errorExpanded)}
                sx={{ color: "inherit" }}
              >
                {errorExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            ) : null
          }
        >
          {error.length > 100 && !errorExpanded ? (
            <Box>
              <Typography variant="body2" component="span">
                {error.substring(0, 100)}...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {error}
            </Box>
          )}
        </Alert>
      )}

      {/* Compression Suggestion Warning */}
      {enableCompression &&
        chat.messages.length > compressionThreshold &&
        !compressing && (
          <Alert
            severity="info"
            sx={{ mx: 2, mb: 1 }}
            action={
              <Button
                size="small"
                color="inherit"
                onClick={handleCompressClick}
                startIcon={<CompressIcon />}
              >
                Compress
              </Button>
            }
          >
            The conversation is getting long ({chat.messages.length} messages).
            Consider compressing it to maintain context while reducing token
            usage.
          </Alert>
        )}

      {/* Suggested Prompts */}
      {enableSuggestions && !responding && !compressing && (
        <SuggestedPrompts
          suggestions={currentSuggestions}
          onSuggestionClick={(suggestion) => {
            submitUserMessage(suggestion);
            onMessageSent?.(suggestion);
          }}
          disabled={responding || compressing}
        />
      )}

      {/* Input Area */}
      <ChatInput
        value={newPrompt}
        onChange={setNewPrompt}
        onSubmit={handleSubmit}
        disabled={responding || compressing || isLoading}
        placeholder={
          isLoading
            ? "Loading..."
            : compressing
              ? "Compressing conversation..."
              : placeholder
        }
      />

      {/* Usage Display */}
      {chat.totalUsage.estimatedCost > 0 && (
        <Box
          sx={{
            px: 2,
            py: 0.5,
            borderTop: 1,
            borderColor: "divider",
            backgroundColor: "grey.50",
            fontSize: "0.75rem",
            color: "text.secondary",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            Tokens: {chat.totalUsage.promptTokens.toLocaleString()} prompt /{" "}
            {chat.totalUsage.completionTokens.toLocaleString()} completion
          </span>
          <span>Est. cost: ${chat.totalUsage.estimatedCost.toFixed(4)}</span>
        </Box>
      )}

      {/* Compress Confirmation Dialog */}
      {enableCompression && (
        <CompressConfirmDialog
          open={compressDialogOpen}
          onClose={handleCompressCancel}
          onConfirm={handleCompressConfirm}
          messageCount={chat.messages.length}
        />
      )}

      {/* Settings Dialog */}
      {enableModelSelection && availableModels.length > 0 && (
        <ChatSettingsDialog
          open={settingsDialogOpen}
          onClose={handleSettingsClose}
          currentModel={chat.model}
          onModelChange={handleModelChange}
          availableModels={availableModels}
          cheapModels={cheapModels}
        />
      )}
    </Box>
  );
}

export default ChatPanel;
