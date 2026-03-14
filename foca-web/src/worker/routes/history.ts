// =============================================================================
// GET /api/history
// Returns the list of all analyses, most recent first.
// =============================================================================

import { Hono } from "hono";
import type { HonoEnv } from "../app";
import { getHistory } from "../lib/db";

export const historyRoute = new Hono<HonoEnv>();

historyRoute.get("/history", async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const clamped = Math.min(Math.max(limit, 1), 200);

  try {
    const rows = await getHistory(c.env.DB, clamped);
    return c.json({ analyses: rows });
  } catch (err) {
    console.error("History fetch error:", err);
    return c.json({ error: "Failed to fetch history" }, 500);
  }
});
