// Types for DANDI API response based on sample_response.json

export interface AccessRequirements {
  status: string;
  schemaKey: string;
  embargoedUntil?: string;
}

export interface Contributor {
  url?: string;
  name: string;
  email?: string;
  roleName?: string[];
  schemaKey: string;
  identifier?: string;
  affiliation?: unknown[];
  includeInCitation?: boolean;
  awardNumber?: string;
}

export interface RelatedResource {
  url: string;
  name: string;
  relation: string;
  schemaKey: string;
  identifier?: string;
  repository?: string;
  resourceType?: string;
}

export interface AssetsSummary {
  schemaKey: string;
  numberOfBytes: number;
  numberOfFiles: number;
  species?: unknown[];
  approach?: unknown[];
  measurementTechnique?: unknown[];
  variableMeasured?: unknown[];
  dataStandard?: unknown[];
}

export interface ValidationError {
  field: string;
  message: string;
  path?: string;
}

export interface DandisetInfo {
  identifier: string;
  created: string;
  modified: string;
  contact_person: string;
  embargo_status: string;
  star_count: number;
  is_starred: boolean;
}

// The editable metadata object
export interface DandisetMetadata {
  id: string;
  url: string;
  name: string;
  about: unknown[];
  access: AccessRequirements[];
  license: string[];
  version: string;
  "@context": string;
  citation: string;
  schemaKey: string;
  identifier: string;
  repository: string;
  contributor: Contributor[];
  dateCreated: string;
  description: string;
  assetsSummary: AssetsSummary;
  schemaVersion: string;
  ethicsApproval: unknown[];
  wasGeneratedBy: unknown[];
  relatedResource: RelatedResource[];
  manifestLocation: string[];
  keywords?: string[];
  studyTarget?: unknown[];
  protocol?: string[];
}

// Full API response
export interface DandisetVersionInfo {
  version: string;
  name: string;
  asset_count: number;
  active_uploads: number;
  size: number;
  status: string;
  created: string;
  modified: string;
  dandiset: DandisetInfo;
  asset_validation_errors: ValidationError[];
  version_validation_errors: ValidationError[];
  metadata: DandisetMetadata;
  contact_person: string;
}

// Type for pending changes - maps field paths to new values
export interface PendingChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

export type PendingChanges = PendingChange[];
