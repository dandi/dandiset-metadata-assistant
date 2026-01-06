import { Box, Typography, Paper, Divider } from '@mui/material';
import { useMetadataContext } from '../../context/MetadataContext';
import { MetadataField } from './MetadataField';
import type { DandisetMetadata } from '../../types/dandiset';

// Define which fields to display and in what order
const DISPLAY_FIELDS: (keyof DandisetMetadata)[] = [
  'name',
  'description',
  'identifier',
  'url',
  'license',
  'citation',
  'contributor',
  'access',
  'about',
  'keywords',
  'relatedResource',
  'ethicsApproval',
  'wasGeneratedBy',
  'studyTarget',
  'protocol',
  'assetsSummary',
  'schemaVersion',
  'repository',
  'manifestLocation',
  'dateCreated',
];

export function MetadataDisplay() {
  const { versionInfo } = useMetadataContext();

  if (!versionInfo) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          textAlign: 'center',
          backgroundColor: 'grey.50',
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Load a dandiset to view its metadata
        </Typography>
      </Paper>
    );
  }

  const metadata = versionInfo.metadata;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
        Editable Metadata
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Box>
        {DISPLAY_FIELDS.map((field) => {
          const value = metadata[field];
          // Skip undefined fields
          if (value === undefined) return null;

          return (
            <MetadataField
              key={field}
              label={field}
              path={field}
              value={value}
              depth={0}
            />
          );
        })}
      </Box>
    </Paper>
  );
}
