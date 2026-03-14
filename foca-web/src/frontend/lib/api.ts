// =============================================================================
// API client for the FOCA Web backend
// =============================================================================

const BASE = "/api";

export interface AnalysisSummary {
  id: string;
  filename: string;
  filetype: string;
  filesize: number;
  status: "uploaded" | "analyzing" | "completed" | "error";
  created_at: string;
  updated_at: string;
}

export interface LogEntry {
  message: string;
  level: string;
  timestamp: string;
}

export interface AnalysisResult {
  id: string;
  filename: string;
  filetype: string;
  filesize: number;
  status: string;
  metadata: Record<string, unknown> | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
  logs: LogEntry[];
}

export interface AnalyzeResponse {
  id: string;
  filename: string;
  status: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

// Upload a file for analysis
export async function analyzeFile(file: File): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Upload failed (${res.status})`);
  }

  return res.json() as Promise<AnalyzeResponse>;
}

// Fetch analysis history
export async function fetchHistory(): Promise<AnalysisSummary[]> {
  const res = await fetch(`${BASE}/history`);
  if (!res.ok) throw new Error("Failed to fetch history");
  const body = (await res.json()) as { analyses: AnalysisSummary[] };
  return body.analyses;
}

// Fetch a single result by ID
export async function fetchResult(id: string): Promise<AnalysisResult> {
  const res = await fetch(`${BASE}/result/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("Analysis not found");
    throw new Error("Failed to fetch result");
  }
  return res.json() as Promise<AnalysisResult>;
}

// Get the download URL for a cleaned file
export function cleanDownloadUrl(id: string): string {
  return `${BASE}/download-clean/${id}`;
}

// Request an AI-generated summary of the metadata (via AI Gateway foca-v1)
export async function summarizeAnalysis(id: string): Promise<string> {
  const res = await fetch(`${BASE}/summarize/${id}`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Summary failed (${res.status})`,
    );
  }
  const data = (await res.json()) as { summary: string };
  return data.summary;
}

// Verify a Turnstile token server-side
export async function verifyTurnstile(token: string): Promise<boolean> {
  const res = await fetch(`${BASE}/turnstile/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success: boolean };
  return data.success;
}
