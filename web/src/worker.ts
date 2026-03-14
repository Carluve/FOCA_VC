/**
 * FOCA Web - Cloudflare Worker entry point.
 * Hono.js application handling all API routes.
 *
 * Static assets (frontend) are served by the [assets] config in wrangler.toml
 * before reaching this Worker. Only /api/* requests hit this code.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./types";

import authRoutes from "./api/auth";
import analyzeRoutes from "./api/analyze";
import { requireAuth } from "./api/middleware";

const app = new Hono<{ Bindings: Env }>();

// ── Global Middleware ────────────────────────────────────────────

app.use("/api/*", cors());
app.use("/api/*", logger());

// ── Health Check (no auth required) ─────────────────────────────

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    service: "foca-web",
    timestamp: new Date().toISOString(),
  });
});

// ── Auth Routes (no auth required) ──────────────────────────────

app.route("/api/auth", authRoutes);

// ── Protected API Routes ────────────────────────────────────────
// Apply auth middleware before the protected route handlers

app.use("/api/analyze", requireAuth);
app.use("/api/history", requireAuth);
app.use("/api/result/*", requireAuth);
app.use("/api/download-clean/*", requireAuth);

// Mount analyze sub-router at /api
// analyzeRoutes defines: POST /analyze, GET /history, GET /result/:id, GET /download-clean/:id
app.route("/api", analyzeRoutes);

// ── Catch-all for unknown API routes ────────────────────────────

app.all("/api/*", (c) => {
  return c.json({ error: "Not found", path: c.req.path }, 404);
});

// ── Export ───────────────────────────────────────────────────────

export default app;
