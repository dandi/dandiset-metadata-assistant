import { FunctionComponent } from "react";
import { Box, Paper, Typography, Chip } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import BuildIcon from "@mui/icons-material/Build";
import MarkdownContent from "./MarkdownContent";
import { ChatMessage, ORContentPart } from "../../chat/types";

interface MessageItemProps {
  message: ChatMessage;
  inProgress?: boolean;
}

const messageContentToString = (
  content: string | ORContentPart[] | null
): string => {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .map((part) => {
      if (part.type === "text") return part.text;
      else if (part.type === "image_url")
        return `![Image](${part.image_url.url})`;
      else return "";
    })
    .join("\n");
};

const MessageItem: FunctionComponent<MessageItemProps> = ({
  message,
  inProgress = false,
}) => {
  if (message.role === "user") {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mb: 2,
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: "80%",
            backgroundColor: "primary.main",
            color: "white",
            borderRadius: 2,
            borderTopRightRadius: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <PersonIcon sx={{ fontSize: 20, mt: 0.5 }} />
            <Typography
              variant="body1"
              sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {typeof message.content === "string"
                ? message.content
                : messageContentToString(message.content)}
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (message.role === "assistant") {
    const content = messageContentToString(message.content);
    const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          mb: 2,
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: "85%",
            backgroundColor: "grey.100",
            borderRadius: 2,
            borderTopLeftRadius: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <SmartToyIcon sx={{ fontSize: 20, mt: 0.5, color: "primary.main" }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {content && (
                <Box
                  sx={{
                    "& p": { mt: 0, mb: 1 },
                    "& p:last-child": { mb: 0 },
                    "& pre": {
                      backgroundColor: "white",
                      p: 1,
                      borderRadius: 1,
                      overflow: "auto",
                    },
                    "& code": {
                      fontSize: "0.875rem",
                    },
                    "& ul, & ol": { mt: 0, mb: 1, pl: 2 },
                  }}
                >
                  <MarkdownContent content={content} doRehypeRaw={!inProgress} />
                </Box>
              )}
              {hasToolCalls && (
                <Box sx={{ mt: content ? 1 : 0 }}>
                  {message.tool_calls!.map((toolCall, index) => (
                    <Chip
                      key={index}
                      icon={<BuildIcon sx={{ fontSize: 16 }} />}
                      label={`${inProgress ? "Calling" : "Called"}: ${toolCall.function.name}`}
                      color={inProgress ? "warning" : "success"}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1, mb: 0.5 }}
                    />
                  ))}
                </Box>
              )}
              {inProgress && !content && !hasToolCalls && (
                <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
                  Thinking...
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (message.role === "tool") {
    // Parse tool result for display
    let resultContent = message.content;
    let isSuccess = true;
    try {
      const parsed = JSON.parse(message.content);
      if (parsed.success !== undefined) {
        isSuccess = parsed.success;
        resultContent = parsed.message || parsed.error || message.content;
      }
    } catch {
      // Keep original content if not JSON
    }

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          mb: 2,
          pl: 4,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            maxWidth: "75%",
            backgroundColor: isSuccess ? "success.lighter" : "error.lighter",
            border: 1,
            borderColor: isSuccess ? "success.light" : "error.light",
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <BuildIcon
              sx={{
                fontSize: 16,
                mt: 0.3,
                color: isSuccess ? "success.main" : "error.main",
              }}
            />
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: isSuccess ? "success.dark" : "error.dark",
              }}
            >
              {resultContent}
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  return null;
};

export default MessageItem;
