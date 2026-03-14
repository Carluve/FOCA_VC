/**
 * POST /api/analyze - Upload and analyze a document.
 * GET  /api/history - List all analysis jobs.
 * GET  /api/result/:id - Get detailed result for a job.
 * GET  /api/download-clean/:id - Download a "cleaned" version of the file.
 */

import { Hono } from "hono";
import type { Env, AnalysisJob } from "../types";
import { analyzeFile, isSupportedExtension, getSupportedExtensions } from "../extractors/base";
import { getExtension } from "../lib/metadata";

const analyze = new Hono<{ Bindings: Env }>();

// ── POST /analyze ───────────────────────────────────────────────

analyze.post("/analyze", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file uploaded. Send a 'file' field in multipart/form-data." }, 400);
  }

  const ext = getExtension(file.name);
  if (!isSupportedExtension(ext)) {
    return c.json(
      {
        error: `Unsupported file type: ${ext}. Supported: ${getSupportedExtensions().join(", ")}`,
      },
      400
    );
  }

  // Size limit: 25 MB (Workers free tier limit)
  if (file.size > 25 * 1024 * 1024) {
    return c.json({ error: "File too large. Maximum size is 25 MB." }, 413);
  }

  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert initial job record
  await c.env.DB.prepare(
    `INSERT INTO analysis_jobs (id, filename, file_type, file_size, status, log_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'uploaded', ?, ?, ?)`
  )
    .bind(
      jobId,
      file.name,
      ext,
      file.size,
      JSON.stringify([{ timestamp: now, message: "File uploaded", level: "info" }]),
      now,
      now
    )
    .run();

  // Store original file in R2 for later download/clean
  const buffer = await file.arrayBuffer();
  await c.env.BUCKET.put(`originals/${jobId}${ext}`, buffer, {
    customMetadata: { filename: file.name },
  });

  // Update status to analyzing
  await c.env.DB.prepare(
    `UPDATE analysis_jobs SET status = 'analyzing', updated_at = ? WHERE id = ?`
  )
    .bind(new Date().toISOString(), jobId)
    .run();

  // Perform extraction
  try {
    const result = await analyzeFile(file.name, buffer);

    // Store results
    await c.env.DB.prepare(
      `UPDATE analysis_jobs
       SET status = 'completed',
           metadata_json = ?,
           log_json = ?,
           updated_at = ?
       WHERE id = ?`
    )
      .bind(
        JSON.stringify(result.metadata),
        JSON.stringify(result.log),
        new Date().toISOString(),
        jobId
      )
      .run();

    return c.json({
      id: jobId,
      status: "completed" as const,
      message: `Analysis complete for ${file.name}`,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    await c.env.DB.prepare(
      `UPDATE analysis_jobs
       SET status = 'error',
           error_message = ?,
           updated_at = ?
       WHERE id = ?`
    )
      .bind(errorMsg, new Date().toISOString(), jobId)
      .run();

    return c.json(
      {
        id: jobId,
        status: "error" as const,
        message: `Analysis failed: ${errorMsg}`,
      },
      500
    );
  }
});

// ── GET /api/history ────────────────────────────────────────────

analyze.get("/history", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") || 50), 200);
  const offset = Number(c.req.query("offset") || 0);

  const result = await c.env.DB.prepare(
    `SELECT id, filename, file_type, file_size, status, created_at, updated_at
     FROM analysis_jobs
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(limit, offset)
    .all<AnalysisJob>();

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM analysis_jobs`
  ).first<{ total: number }>();

  return c.json({
    jobs: result.results,
    total: countResult?.total || 0,
  });
});

// ── GET /api/result/:id ─────────────────────────────────────────

analyze.get("/result/:id", async (c) => {
  const id = c.req.param("id");

  const job = await c.env.DB.prepare(
    `SELECT * FROM analysis_jobs WHERE id = ?`
  )
    .bind(id)
    .first<AnalysisJob>();

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  return c.json({
    job: {
      id: job.id,
      filename: job.filename,
      file_type: job.file_type,
      file_size: job.file_size,
      status: job.status,
      created_at: job.created_at,
      updated_at: job.updated_at,
    },
    metadata: job.metadata_json ? JSON.parse(job.metadata_json) : null,
    log: job.log_json ? JSON.parse(job.log_json) : [],
  });
});

// ── GET /api/download-clean/:id ─────────────────────────────────

analyze.get("/download-clean/:id", async (c) => {
  const id = c.req.param("id");

  const job = await c.env.DB.prepare(
    `SELECT id, filename, file_type, status FROM analysis_jobs WHERE id = ?`
  )
    .bind(id)
    .first<AnalysisJob>();

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  if (job.status !== "completed") {
    return c.json({ error: "Analysis not yet completed" }, 400);
  }

  // For this prototype, we serve the original file.
  // A production version would strip metadata before serving.
  const object = await c.env.BUCKET.get(`originals/${id}${job.file_type}`);

  if (!object) {
    return c.json({ error: "Original file not found in storage" }, 404);
  }

  const cleanName = `clean_${job.filename}`;

  return new Response(object.body, {
    headers: {
      "Content-Type": getContentType(job.file_type),
      "Content-Disposition": `attachment; filename="${cleanName}"`,
      "X-FOCA-Note":
        "Prototype: file served as-is. Production version strips metadata.",
    },
  });
});

export default analyze;

// ── Helpers ─────────────────────────────────────────────────────

function getContentType(ext: string): string {
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".ppsx": "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
  };
  return map[ext] || "application/octet-stream";
}
