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
                Key will be saved. <strong>Caution:</strong> Uses localStorage which stores data in plain text. Do not use on shared computers.
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
