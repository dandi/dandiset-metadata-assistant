import { Box, Button, Typography, Tooltip, Badge } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LockIcon from '@mui/icons-material/Lock';
import { useMetadataContext } from '../../context/MetadataContext';

export function CommitButton() {
  const { pendingChanges, clearPendingChanges, apiKey, versionInfo } = useMetadataContext();

  const hasChanges = pendingChanges.length > 0;
  const canCommit = hasChanges && !!apiKey && !!versionInfo;

  const handleCommit = () => {
    // Placeholder - will be implemented later
    alert('Commit functionality will be implemented later.\n\nPending changes:\n' + 
      pendingChanges.map(c => `${c.path}: ${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)}`).join('\n'));
  };

  const handleDiscard = () => {
    if (window.confirm('Are you sure you want to discard all pending changes?')) {
      clearPendingChanges();
    }
  };

  if (!versionInfo) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      {/* Pending changes indicator */}
      {hasChanges && (
        <Typography variant="body2" color="primary">
          <Badge badgeContent={pendingChanges.length} color="primary" sx={{ mr: 1 }}>
            <span />
          </Badge>
          {pendingChanges.length} pending change{pendingChanges.length !== 1 ? 's' : ''}
        </Typography>
      )}

      {/* Discard button */}
      <Button
        variant="outlined"
        color="warning"
        size="small"
        startIcon={<DeleteSweepIcon />}
        onClick={handleDiscard}
        disabled={!hasChanges}
      >
        Discard All
      </Button>

      {/* Commit button */}
      <Tooltip
        title={
          !apiKey
            ? 'API key required to commit changes'
            : !hasChanges
            ? 'No pending changes to commit'
            : 'Commit all pending changes'
        }
      >
        <span>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={!apiKey ? <LockIcon /> : <SaveIcon />}
            onClick={handleCommit}
            disabled={!canCommit}
          >
            Commit Changes
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
}
