import { FunctionComponent, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  IconButton,
  InputAdornment,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { ModelConfig } from "../types";
import {
  getStoredOpenRouterApiKey,
  setStoredOpenRouterApiKey,
  clearStoredOpenRouterApiKey,
  maskApiKey,
} from "../utils/apiKeyStorage";

interface ChatSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  currentModel: string;
  onModelChange: (model: string) => void;
  availableModels: ModelConfig[];
  cheapModels?: string[];
}

const ChatSettingsDialog: FunctionComponent<ChatSettingsDialogProps> = ({
  open,
  onClose,
  currentModel,
  onModelChange,
  availableModels,
  cheapModels = [],
}) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Check for stored key on each render when open (derived state)
  const hasStoredKey = useMemo(() => {
    if (!open) return false;
    // refreshKey forces re-check after save/clear
    void refreshKey;
    return !!getStoredOpenRouterApiKey();
  }, [open, refreshKey]);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      setStoredOpenRouterApiKey(apiKey.trim());
      setApiKey("");
      setRefreshKey((k) => k + 1);
    }
  };

  const handleClearApiKey = () => {
    clearStoredOpenRouterApiKey();
    setApiKey("");
    setRefreshKey((k) => k + 1);
  };

  const requiresApiKey = !cheapModels.includes(currentModel);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Chat Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          {/* Model Selection */}
          <FormControl fullWidth>
            <InputLabel id="model-select-label">AI Model</InputLabel>
            <Select
              labelId="model-select-label"
              value={currentModel}
              label="AI Model"
              onChange={(e) => onModelChange(e.target.value)}
            >
              {availableModels.map((model) => (
                <MenuItem key={model.model} value={model.model}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                      alignItems: "center",
                    }}
                  >
                    <span>{model.label}</span>
                    <Typography
                      variant="caption"
                      sx={{
                        ml: 2,
                        color: cheapModels.includes(model.model)
                          ? "success.main"
                          : "warning.main",
                      }}
                    >
                      {cheapModels.includes(model.model)
                        ? "Free"
                        : `$${model.cost.prompt}/$${model.cost.completion} per 1M tokens`}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Model Info */}
          <Alert severity={requiresApiKey ? "warning" : "info"}>
            {requiresApiKey ? (
              <>
                <strong>{currentModel.split("/")[1]}</strong> requires an
                OpenRouter API key. Get one at{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  openrouter.ai/keys
                </a>
              </>
            ) : (
              <>
                <strong>{currentModel.split("/")[1]}</strong> is a free model
                and doesn't require your own API key.
              </>
            )}
          </Alert>

          {/* API Key Section */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              OpenRouter API Key (Optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Required only for premium models. Your key is stored locally in
              your browser.
            </Typography>

            {hasStoredKey ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <TextField
                  fullWidth
                  value={maskApiKey(getStoredOpenRouterApiKey() || "")}
                  disabled
                  size="small"
                  label="Stored API Key"
                />
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleClearApiKey}
                  size="small"
                >
                  Remove
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <TextField
                  fullWidth
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-..."
                  size="small"
                  label="Enter API Key"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowApiKey(!showApiKey)}
                          edge="end"
                          size="small"
                        >
                          {showApiKey ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSaveApiKey}
                  disabled={!apiKey.trim()}
                  size="small"
                >
                  Save
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChatSettingsDialog;
