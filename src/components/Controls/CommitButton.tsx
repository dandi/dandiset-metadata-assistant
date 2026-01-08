import { useState } from 'react';
import { Box, Button, Typography, Tooltip, Badge, CircularProgress, Alert, Snackbar } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LockIcon from '@mui/icons-material/Lock';
import { useMetadataContext } from '../../context/MetadataContext';
import { commitMetadataChanges, fetchDandisetVersionInfo } from '../../utils/api';

export function CommitButton() {
  const { 
    pendingChanges, 
    clearPendingChanges, 
    apiKey, 
    versionInfo,
    dandisetId,
    version,
    getModifiedMetadata,
    setVersionInfo,
    setIsLoading,
  } = useMetadataContext();

  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitSuccess, setCommitSuccess] = useState(false);

  const hasChanges = pendingChanges.length > 0;
  const canCommit = hasChanges && !!apiKey && !!versionInfo;

  const handleCommit = async () => {
    if (!apiKey || !versionInfo || !dandisetId || !version) {
      return;
    }

    // Get the modified metadata with all pending changes applied
    const modifiedMetadata = getModifiedMetadata();
    if (!modifiedMetadata) {
      setCommitError('Failed to generate modified metadata');
      return;
    }

    setIsCommitting(true);
    setCommitError(null);

    try {
      // Commit the changes via the proxy
      await commitMetadataChanges(dandisetId, version, modifiedMetadata, apiKey);

      // Success! Clear pending changes
      clearPendingChanges();
      setCommitSuccess(true);

      // Refresh the version info to get the latest state
      setIsLoading(true);
      try {
        const updatedInfo = await fetchDandisetVersionInfo(dandisetId, version, apiKey);
        setVersionInfo(updatedInfo);
      } catch (refreshError) {
        console.warn('Failed to refresh version info after commit:', refreshError);
        // Don't show error to user - commit was successful
      } finally {
        setIsLoading(false);
      }

    } catch (error) {
      console.error('Commit failed:', error);
      setCommitError(error instanceof Error ? error.message : 'Failed to commit changes');
    } finally {
      setIsCommitting(false);
    }
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
    <>
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
          disabled={!hasChanges || isCommitting}
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
              startIcon={isCommitting ? <CircularProgress size={16} color="inherit" /> : (!apiKey ? <LockIcon /> : <SaveIcon />)}
              onClick={handleCommit}
              disabled={!canCommit || isCommitting}
            >
              {isCommitting ? 'Committing...' : 'Commit Changes'}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* Success snackbar */}
      <Snackbar
        open={commitSuccess}
        autoHideDuration={6000}
        onClose={() => setCommitSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setCommitSuccess(false)} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          Metadata committed successfully!
        </Alert>
      </Snackbar>

      {/* Error snackbar */}
      <Snackbar
        open={!!commitError}
        autoHideDuration={10000}
        onClose={() => setCommitError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setCommitError(null)} 
          severity="error" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {commitError}
        </Alert>
      </Snackbar>
    </>
  );
}
