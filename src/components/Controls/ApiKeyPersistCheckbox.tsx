import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';

interface ApiKeyPersistCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ApiKeyPersistCheckbox({ checked, onChange }: ApiKeyPersistCheckboxProps) {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
      }
      label={
        <Box sx={{ ml: 0 }}>
          <Typography variant="body2">Save API key in browser</Typography>
          <Typography variant="caption" color="text.secondary">
            {checked ? (
              <>
                Key will be saved in this browser. <strong>Caution:</strong> Data stored in localStorage persists after you close the browser and may be accessible to other users of this device. Avoid enabling this on shared or public computers.
              </>
            ) : (
              'Key will be cleared when browser closes'
            )}
          </Typography>
        </Box>
      }
      sx={{ ml: 0, alignItems: 'flex-start' }}
    />
  );
}
