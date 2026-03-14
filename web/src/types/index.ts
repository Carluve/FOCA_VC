// ── Cloudflare Bindings ──────────────────────────────────────────
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  KV: KVNamespace;
  AUTH_PASSWORD: string;
  ENVIRONMENT: string;
}

// ── Analysis Job States ─────────────────────────────────────────
export type JobStatus = "uploaded" | "analyzing" | "completed" | "error";

// ── D1 Row: analysis_jobs table ─────────────────────────────────
export interface AnalysisJob {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: JobStatus;
  metadata_json: string | null;
  log_json: string | null;
  created_at: string;
  updated_at: string;
}

// ── Extracted Metadata (mirrors C# FileMetadata) ────────────────
export interface FileMetadata {
  title?: string;
  subject?: string;
  description?: string;
  keywords?: string;
  category?: string;
  company?: string;
  language?: string;
  template?: string;
  operatingSystem?: string;
  statistic?: string;
  comments?: string;
  users: MetadataUser[];
  emails: string[];
  applications: MetadataApplication[];
  printers: string[];
  paths: MetadataPath[];
  history: MetadataHistory[];
  servers: string[];
  passwords: MetadataPassword[];
  dates: MetadataDates;
  gps?: GeoLocation;
  embeddedImages: Record<string, FileMetadata>;
  makernotes: Record<string, Record<string, string>>;
}

export interface MetadataUser {
  value: string;
  isComputerUser: boolean;
  notes?: string;
}

export interface MetadataApplication {
  value: string;
  source?: string;
}

export interface MetadataPath {
  value: string;
  isComputerFolder: boolean;
}

export interface MetadataHistory {
  value: string;
  author?: string;
  comments?: string;
  path?: string;
  date?: string;
}

export interface MetadataPassword {
  value: string;
  type?: string;
  source?: string;
}

export interface MetadataDates {
  creationDate?: string;
  modificationDate?: string;
  printingDate?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: string;
}

// ── Log Entry ───────────────────────────────────────────────────
export interface LogEntry {
  timestamp: string;
  message: string;
  level: "info" | "warn" | "error";
}

// ── API Responses ───────────────────────────────────────────────
export interface AnalyzeResponse {
  id: string;
  status: JobStatus;
  message: string;
}

export interface HistoryResponse {
  jobs: AnalysisJob[];
  total: number;
}

export interface ResultResponse {
  job: AnalysisJob;
  metadata: FileMetadata;
  log: LogEntry[];
}
