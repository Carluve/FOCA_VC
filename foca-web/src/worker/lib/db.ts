// =============================================================================
// D1 helper functions
// =============================================================================

export interface AnalysisRow {
  id: string;
  filename: string;
  filetype: string;
  filesize: number;
  status: "uploaded" | "analyzing" | "completed" | "error";
  metadata: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogRow {
  id: number;
  analysis_id: string;
  message: string;
  level: string;
  created_at: string;
}

// Insert a new analysis record
export async function createAnalysis(
  db: D1Database,
  id: string,
  filename: string,
  filetype: string,
  filesize: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO analyses (id, filename, filetype, filesize, status)
       VALUES (?, ?, ?, ?, 'uploaded')`,
    )
    .bind(id, filename, filetype, filesize)
    .run();
}

// Update analysis status and optionally set metadata JSON
export async function updateAnalysis(
  db: D1Database,
  id: string,
  status: string,
  metadata?: string,
): Promise<void> {
  if (metadata !== undefined) {
    await db
      .prepare(
        `UPDATE analyses SET status = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .bind(status, metadata, id)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE analyses SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .bind(status, id)
      .run();
  }
}

// Fetch the full history list, most recent first
export async function getHistory(
  db: D1Database,
  limit = 50,
): Promise<AnalysisRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, filename, filetype, filesize, status, created_at, updated_at
       FROM analyses ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<AnalysisRow>();
  return results ?? [];
}

// Fetch a single analysis by ID
export async function getAnalysis(
  db: D1Database,
  id: string,
): Promise<AnalysisRow | null> {
  return (
    (await db
      .prepare(`SELECT * FROM analyses WHERE id = ?`)
      .bind(id)
      .first<AnalysisRow>()) ?? null
  );
}

// Append a log entry for an analysis
export async function addLog(
  db: D1Database,
  analysisId: string,
  message: string,
  level: "info" | "warn" | "error" = "info",
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO processing_logs (analysis_id, message, level) VALUES (?, ?, ?)`,
    )
    .bind(analysisId, message, level)
    .run();
}

// Save AI summary for an analysis
export async function saveSummary(
  db: D1Database,
  id: string,
  summary: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE analyses SET ai_summary = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(summary, id)
    .run();
}

// Fetch logs for an analysis
export async function getLogs(
  db: D1Database,
  analysisId: string,
): Promise<LogRow[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM processing_logs WHERE analysis_id = ? ORDER BY created_at ASC`,
    )
    .bind(analysisId)
    .all<LogRow>();
  return results ?? [];
}
