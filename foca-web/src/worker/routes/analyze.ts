// =============================================================================
// POST /api/analyze
// Receives a file via multipart/form-data, stores it in R2, extracts
// metadata, stores results in D1, and returns the analysis ID.
// =============================================================================

import { Hono } from "hono";
import type { HonoEnv } from "../app";
import { generateId } from "../lib/uuid";
import { createAnalysis, updateAnalysis, addLog } from "../lib/db";
import { extractMetadata } from "../extractors";

export const analyzeRoute = new Hono<HonoEnv>();

// Max file size: 25 MB (Workers limit for buffered requests)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

analyzeRoute.post("/analyze", async (c) => {
  const env = c.env;

  // --- 1. Parse multipart form data ---
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid multipart/form-data request" }, 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return c.json({ error: "Missing 'file' field in form data" }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json(
      { error: `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      413,
    );
  }

  if (file.size === 0) {
    return c.json({ error: "File is empty" }, 400);
  }

  // --- 2. Create analysis record in D1 ---
  const id = generateId();
  const filename = file.name || "unknown";
  const filetype = file.type || "application/octet-stream";

  try {
    await createAnalysis(env.DB, id, filename, filetype, file.size);
    await addLog(env.DB, id, `File uploaded: ${filename} (${formatBytes(file.size)})`);
  } catch (err) {
    console.error("D1 insert error:", err);
    return c.json({ error: "Database error creating analysis record" }, 500);
  }

  // --- 3. Store original file in R2 ---
  const buffer = await file.arrayBuffer();
  try {
    await env.R2.put(`originals/${id}/${filename}`, buffer, {
      httpMetadata: { contentType: filetype },
      customMetadata: { analysisId: id, originalName: filename },
    });
    await addLog(env.DB, id, "Original file stored in R2");
  } catch (err) {
    console.error("R2 upload error:", err);
    await addLog(env.DB, id, "Warning: Failed to store file in R2", "warn");
    // Continue anyway -- we already have the buffer in memory for extraction
  }

  // --- 4. Extract metadata ---
  try {
    await updateAnalysis(env.DB, id, "analyzing");
    await addLog(env.DB, id, "Metadata extraction started");

    const metadata = await extractMetadata(buffer, filename, filetype);

    await updateAnalysis(env.DB, id, "completed", JSON.stringify(metadata));
    await addLog(env.DB, id, "Metadata extraction completed");

    // Log summary
    const summary = [
      metadata.users.length > 0 ? `${metadata.users.length} user(s)` : null,
      metadata.emails.length > 0 ? `${metadata.emails.length} email(s)` : null,
      metadata.paths.length > 0 ? `${metadata.paths.length} path(s)` : null,
      metadata.servers.length > 0 ? `${metadata.servers.length} server(s)` : null,
    ]
      .filter(Boolean)
      .join(", ");

    if (summary) {
      await addLog(env.DB, id, `Found: ${summary}`);
    }

    if (metadata.warnings.length > 0) {
      for (const w of metadata.warnings) {
        await addLog(env.DB, id, w, "warn");
      }
    }

    return c.json({
      id,
      filename,
      status: "completed",
      metadata,
    });
  } catch (err) {
    console.error("Extraction error:", err);
    const message = err instanceof Error ? err.message : "Unknown extraction error";
    await updateAnalysis(env.DB, id, "error");
    await addLog(env.DB, id, `Extraction failed: ${message}`, "error");

    return c.json(
      {
        id,
        filename,
        status: "error",
        error: message,
      },
      500,
    );
  }
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
