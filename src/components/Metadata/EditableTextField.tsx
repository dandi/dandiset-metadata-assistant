import { useState } from 'react';
import {
  Alert,
  Box,
  IconButton,
  TextField,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

interface EditableTextFieldProps {
  value: string | null | undefined;
  onSave: (value: string) => { success: boolean; error?: string };
  label: string;
  maxLength?: number;
  multiline?: boolean;
  useDialog?: boolean;
}

/**
 * Inline editable text field for title and description
 * For short text (title): inline editing
 * For long text (description): uses dialog
 */
export function EditableTextField({
  value,
  onSave,
  label,
  maxLength,
  multiline = false,
  useDialog = false,
}: EditableTextFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartEdit = () => {
    setEditValue(value || '');
    setError(null);
    if (useDialog) {
      setDialogOpen(true);
    } else {
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    const result = onSave(editValue);
    if (result.success) {
      setIsEditing(false);
      setDialogOpen(false);
      setError(null);
    } else {
      setError(result.error || 'Failed to save');
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
    setDialogOpen(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !multiline) {
      handleSave();
    }
  };

  // Dialog mode for long text
  if (useDialog) {
    return (
      <>
        <Tooltip title={`Edit ${label.toLowerCase()}`}>
          <IconButton
            size="small"
            onClick={handleStartEdit}
            sx={{
              ml: 0.5,
              p: 0.25,
              opacity: 0.6,
              '&:hover': { opacity: 1 },
            }}
          >
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        <Dialog
          open={dialogOpen}
          onClose={handleCancel}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Edit {label}
            <IconButton onClick={handleCancel} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth
              multiline
              minRows={6}
              maxRows={20}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              inputProps={{ maxLength }}
              autoFocus
              error={!!error}
              sx={{ mt: 1 }}
            />
            {maxLength && (
              <Typography
                variant="caption"
                color={editValue.length > maxLength * 0.9 ? 'warning.main' : 'text.secondary'}
                sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}
              >
                {editValue.length} / {maxLength}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="contained" color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  // Inline edit mode for short text
  if (isEditing) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, width: '100%' }}>
          <TextField
            fullWidth
            size="small"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            inputProps={{ maxLength }}
            autoFocus
            multiline={multiline}
            maxRows={multiline ? 4 : 1}
            error={!!error}
            helperText={error}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Tooltip title="Save">
              <IconButton
                size="small"
                onClick={handleSave}
                color="primary"
                sx={{ p: 0.5 }}
              >
                <CheckIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancel">
              <IconButton
                size="small"
                onClick={handleCancel}
                sx={{ p: 0.5 }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        {maxLength && !error && (
          <Typography
            variant="caption"
            color={editValue.length > maxLength * 0.9 ? 'warning.main' : 'text.secondary'}
            sx={{ textAlign: 'right', mt: 0.5 }}
          >
            {editValue.length} / {maxLength}
          </Typography>
        )}
      </Box>
    );
  }

  // Display mode with edit button
  return (
    <Tooltip title={`Edit ${label.toLowerCase()}`}>
      <IconButton
        size="small"
        onClick={handleStartEdit}
        sx={{
          ml: 0.5,
          p: 0.25,
          opacity: 0.6,
          '&:hover': { opacity: 1 },
        }}
      >
        <EditIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Tooltip>
  );
}
