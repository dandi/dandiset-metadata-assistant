import { Box, Typography, Paper, IconButton, Tooltip, List, ListItem, ListItemText, Chip } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useMetadataContext } from '../../context/MetadataContext';

/**
 * Format a field path for display.
 * Converts "contributor.0.name" to "contributor[0].name"
 */
function formatPath(path: string): string {
  return path.replace(/\.(\d+)/g, '[$1]');
}

export function ChangesSummary() {
  const { pendingChanges, removePendingChange } = useMetadataContext();

  if (pendingChanges.length === 0) {
    return null;
  }

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 2, 
        mb: 2,
        backgroundColor: 'action.hover',
        borderColor: 'primary.light',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <EditNoteIcon color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight="bold">
          Pending Changes
        </Typography>
        <Chip 
          label={pendingChanges.length} 
          size="small" 
          color="primary" 
          sx={{ ml: 'auto' }}
        />
      </Box>

      <List dense disablePadding>
        {pendingChanges.map((change) => (
          <ListItem
            key={change.path}
            disablePadding
            sx={{
              py: 0.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:last-child': { borderBottom: 'none' },
            }}
            secondaryAction={
              <Tooltip title="Undo this change">
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => removePendingChange(change.path)}
                  color="warning"
                >
                  <UndoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            <ListItemText
              primary={
                <Typography 
                  variant="body2" 
                  component="code"
                  sx={{ 
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: 'primary.main',
                  }}
                >
                  {formatPath(change.path)}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
