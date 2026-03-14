// =============================================================================
// GET /api/result/:id
// Returns the full analysis result: metadata + processing logs.
// =============================================================================

import { Hono } from "hono";
import type { HonoEnv } from "../app";
import { getAnalysis, getLogs } from "../lib/db";

export const resultRoute = new Hono<HonoEnv>();

resultRoute.get("/result/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const analysis = await getAnalysis(c.env.DB, id);
    if (!analysis) {
      return c.json({ error: "Analysis not found" }, 404);
    }

    const logs = await getLogs(c.env.DB, id);

    // Parse metadata JSON string back to object
    let metadata = null;
    if (analysis.metadata) {
      try {
        metadata = JSON.parse(analysis.metadata);
      } catch {
        metadata = { raw_string: analysis.metadata };
      }
    }

    return c.json({
      id: analysis.id,
      filename: analysis.filename,
      filetype: analysis.filetype,
      filesize: analysis.filesize,
      status: analysis.status,
      metadata,
      ai_summary: analysis.ai_summary ?? null,
      created_at: analysis.created_at,
      updated_at: analysis.updated_at,
      logs: logs.map((l) => ({
        message: l.message,
        level: l.level,
        timestamp: l.created_at,
      })),
    });
  } catch (err) {
    console.error("Result fetch error:", err);
    return c.json({ error: "Failed to fetch result" }, 500);
  }
});
