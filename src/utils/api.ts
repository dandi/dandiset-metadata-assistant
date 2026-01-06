import type { DandisetVersionInfo } from '../types/dandiset';

const DANDI_API_BASE = 'https://api.dandiarchive.org/api';

export async function fetchDandisetVersionInfo(
  dandisetId: string,
  version: string,
  apiKey?: string | null
): Promise<DandisetVersionInfo> {
  const url = `${DANDI_API_BASE}/dandisets/${dandisetId}/versions/${version}/info/`;
  
  const headers: HeadersInit = {};
  if (apiKey) {
    headers['Authorization'] = `token ${apiKey}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Dandiset ${dandisetId} version ${version} not found`);
    }
    throw new Error(`Failed to fetch dandiset info: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data as DandisetVersionInfo;
}

// Placeholder for committing changes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function commitMetadataChanges(
  dandisetId: string,
  version: string,
  metadata: unknown,
  apiKey: string
): Promise<void> {
  // TODO: Implement actual API call to commit changes
  // Will use: dandisetId, version, metadata, apiKey
  console.log('Commit changes - not yet implemented', { dandisetId, version, metadata, apiKey });
  throw new Error('Commit functionality not yet implemented');
}
