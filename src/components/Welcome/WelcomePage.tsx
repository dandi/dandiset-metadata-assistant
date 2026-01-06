import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Typography,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ScienceIcon from '@mui/icons-material/Science';
import { useMetadataContext } from '../../context/MetadataContext';
import { fetchDandisetVersionInfo } from '../../utils/api';

interface WelcomePageProps {
  onDandisetLoaded: (dandisetId: string, version: string) => void;
}

export function WelcomePage({ onDandisetLoaded }: WelcomePageProps) {
  const {
    setDandisetId,
    setVersion,
    setVersionInfo,
    isLoading,
    setIsLoading,
    error,
    setError,
    clearPendingChanges,
    apiKey,
  } = useMetadataContext();

  const [localDandisetId, setLocalDandisetId] = useState('');
  const [localVersion, setLocalVersion] = useState('draft');
  const [customVersion, setCustomVersion] = useState('');

  const handleLoad = async () => {
    const finalVersion = localVersion === 'custom' ? customVersion : localVersion;
    
    if (!localDandisetId.trim()) {
      setError('Please enter a Dandiset ID');
      return;
    }
    
    if (!finalVersion.trim()) {
      setError('Please enter a version');
      return;
    }

    setIsLoading(true);
    setError(null);
    clearPendingChanges();

    try {
      const info = await fetchDandisetVersionInfo(localDandisetId.trim(), finalVersion.trim(), apiKey);
      setVersionInfo(info);
      setDandisetId(localDandisetId.trim());
      setVersion(finalVersion.trim());
      onDandisetLoaded(localDandisetId.trim(), finalVersion.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dandiset');
      setVersionInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLoad();
    }
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'grey.50',
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 500,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <ScienceIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Dandiset Metadata Assistant
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Load a Dandiset to view and edit its metadata with AI assistance
          </Typography>
        </Box>

        {/* Form */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Dandiset ID"
            placeholder="e.g., 001457"
            value={localDandisetId}
            onChange={(e) => setLocalDandisetId(e.target.value)}
            onKeyPress={handleKeyPress}
            fullWidth
            disabled={isLoading}
            autoFocus
          />

          <FormControl fullWidth>
            <InputLabel>Version</InputLabel>
            <Select
              value={localVersion}
              label="Version"
              onChange={(e) => setLocalVersion(e.target.value)}
              disabled={isLoading}
            >
              <MenuItem value="draft">draft</MenuItem>
              <MenuItem value="custom">Custom version...</MenuItem>
            </Select>
          </FormControl>

          {localVersion === 'custom' && (
            <TextField
              label="Version Number"
              placeholder="e.g., 0.240101.0000"
              value={customVersion}
              onChange={(e) => setCustomVersion(e.target.value)}
              onKeyPress={handleKeyPress}
              fullWidth
              disabled={isLoading}
            />
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleLoad}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <SearchIcon />}
            sx={{ mt: 1 }}
          >
            {isLoading ? 'Loading...' : 'Load Dandiset'}
          </Button>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
