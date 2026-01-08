/**
 * NOTE: Full JSON schema validation with AJV is not possible in Cloudflare Workers
 * due to dynamic code generation restrictions. Instead, we perform basic validation
 * to check essential requirements. The client-side already performs full schema validation
 * before sending to the proxy, so this serves as a lightweight safety check.
 */

/**
 * Validation error interface
 */
export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  params?: Record<string, unknown>;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Basic validation of Dandiset metadata
 * Checks for required fields and basic structure
 */
export async function validateMetadata(metadata: unknown): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  
  // Check if metadata is an object
  if (!metadata || typeof metadata !== 'object') {
    return {
      valid: false,
      errors: [{
        path: '/',
        message: 'Metadata must be an object',
        keyword: 'type',
      }],
    };
  }
  
  const meta = metadata as Record<string, unknown>;
  
  // Check required top-level fields
  const requiredFields = [
    'id',
    'name',
    'description',
    'contributor',
    'license',
    'schemaVersion',
    'identifier',
  ];
  
  for (const field of requiredFields) {
    if (!(field in meta) || meta[field] === null || meta[field] === undefined) {
      errors.push({
        path: `/${field}`,
        message: `Missing required field: ${field}`,
        keyword: 'required',
        params: { missingProperty: field },
      });
    }
  }
  
  // Check that name is a non-empty string
  if (meta.name && typeof meta.name !== 'string') {
    errors.push({
      path: '/name',
      message: 'Field "name" must be a string',
      keyword: 'type',
    });
  } else if (meta.name && (meta.name as string).trim() === '') {
    errors.push({
      path: '/name',
      message: 'Field "name" cannot be empty',
      keyword: 'minLength',
    });
  }
  
  // Check that description is a non-empty string
  if (meta.description && typeof meta.description !== 'string') {
    errors.push({
      path: '/description',
      message: 'Field "description" must be a string',
      keyword: 'type',
    });
  } else if (meta.description && (meta.description as string).trim() === '') {
    errors.push({
      path: '/description',
      message: 'Field "description" cannot be empty',
      keyword: 'minLength',
    });
  }
  
  // Check that contributor is an array
  if (meta.contributor && !Array.isArray(meta.contributor)) {
    errors.push({
      path: '/contributor',
      message: 'Field "contributor" must be an array',
      keyword: 'type',
    });
  } else if (meta.contributor && (meta.contributor as unknown[]).length === 0) {
    errors.push({
      path: '/contributor',
      message: 'Field "contributor" must have at least one entry',
      keyword: 'minItems',
    });
  }
  
  // Check that license is an array
  if (meta.license && !Array.isArray(meta.license)) {
    errors.push({
      path: '/license',
      message: 'Field "license" must be an array',
      keyword: 'type',
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format validation errors into a human-readable string
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';

  return errors
    .map((err) => {
      let msg = err.message;

      // Add more context based on error type
      if (err.keyword === 'enum' && err.params?.allowedValues) {
        msg += `. Allowed values: ${(err.params.allowedValues as unknown[]).join(', ')}`;
      }
      if (err.keyword === 'required' && err.params?.missingProperty) {
        msg = `Missing required property: ${err.params.missingProperty}`;
      }
      if (err.keyword === 'additionalProperties' && err.params?.additionalProperty) {
        msg = `Unknown property: ${err.params.additionalProperty}`;
      }

      const pathStr = err.path && err.path !== '/' ? ` at ${err.path}` : '';
      return `${msg}${pathStr}`;
    })
    .join('; ');
}
