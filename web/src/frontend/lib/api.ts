/**
 * API client for communicating with the FOCA Worker backend.
 */

const API_BASE = "/api";

function getToken(): string | null {
  return sessionStorage.getItem("foca_token");
}

export function setToken(token: string): void {
  sessionStorage.setItem("foca_token", token);
}

export function clearToken(): void {
  sessionStorage.removeItem("foca_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    window.location.hash = "#/login";
    throw new Error("Session expired");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }

  return data as T;
}

// ── Auth ────────────────────────────────────────────────────────

export async function login(password: string): Promise<{ token: string }> {
  const data = await request<{ token: string }>("/auth", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  setToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await request("/auth/logout", { method: "POST" });
  } finally {
    clearToken();
  }
}

export async function verifyToken(): Promise<boolean> {
  try {
    const data = await request<{ valid: boolean }>("/auth/verify");
    return data.valid;
  } catch {
    return false;
  }
}

// ── Analysis ────────────────────────────────────────────────────

export interface AnalyzeResponse {
  id: string;
  status: string;
  message: string;
}

export async function uploadFile(file: File): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return request<AnalyzeResponse>("/analyze", {
    method: "POST",
    body: formData,
  });
}

// ── History ─────────────────────────────────────────────────────

export interface HistoryJob {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface HistoryResponse {
  jobs: HistoryJob[];
  total: number;
}

export async function getHistory(
  limit = 50,
  offset = 0
): Promise<HistoryResponse> {
  return request<HistoryResponse>(`/history?limit=${limit}&offset=${offset}`);
}

// ── Result ──────────────────────────────────────────────────────

export interface ResultResponse {
  job: HistoryJob;
  metadata: Record<string, unknown>;
  log: Array<{ timestamp: string; message: string; level: string }>;
}

export async function getResult(id: string): Promise<ResultResponse> {
  return request<ResultResponse>(`/result/${id}`);
}

// ── Download ────────────────────────────────────────────────────

export function getDownloadUrl(id: string): string {
  return `${API_BASE}/download-clean/${id}`;
}

export async function downloadCleanFile(id: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/download-clean/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) throw new Error("Download failed");

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const filename =
    disposition?.match(/filename="([^"]+)"/)?.[1] || "clean_file";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
