import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface CompressConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  messageCount: number;
}

export function CompressConfirmDialog({
  open,
  onClose,
  onConfirm,
  messageCount,
}: CompressConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Compress Conversation?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will replace the entire conversation ({messageCount} messages) with
          a thorough summary. The summary will preserve key context from all
          messages, tool calls, and metadata changes.
        </DialogContentText>
        <DialogContentText sx={{ mt: 2, fontWeight: 500 }}>
          This action cannot be undone. Continue?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="primary" variant="contained">
          Compress
        </Button>
      </DialogActions>
    </Dialog>
  );
}
