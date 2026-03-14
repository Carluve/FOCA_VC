// =============================================================================
// Shared types for all metadata extractors
// =============================================================================

export interface ExtractedMetadata {
  // Document info
  title?: string;
  subject?: string;
  author?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;

  // Software / versions
  application?: string;
  appVersion?: string;

  // Users found in the document
  users: string[];

  // Emails found
  emails: string[];

  // File paths / folder references found
  paths: string[];

  // Server / printer references
  servers: string[];
  printers: string[];

  // Operating system hints
  operatingSystem?: string;

  // Raw key-value pairs for anything extra
  raw: Record<string, string>;

  // Processing warnings
  warnings: string[];
}

export function emptyMetadata(): ExtractedMetadata {
  return {
    users: [],
    emails: [],
    paths: [],
    servers: [],
    printers: [],
    raw: {},
    warnings: [],
  };
}
