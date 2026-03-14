// =============================================================================
// FOCA Web - Hono Application (all API routes)
// =============================================================================

import { Hono } from "hono";
import { cors } from "hono/cors";
import { analyzeRoute } from "./routes/analyze";
import { historyRoute } from "./routes/history";
import { resultRoute } from "./routes/result";
import { downloadCleanRoute } from "./routes/download-clean";
import { summarizeRoute } from "./routes/summarize";
import { turnstileRoute } from "./routes/turnstile";
import { healthRoute } from "./routes/health";

export type HonoEnv = {
  Bindings: Env;
};

const api = new Hono<HonoEnv>();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
api.use("/*", cors());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
api.route("/api", healthRoute);
api.route("/api", analyzeRoute);
api.route("/api", historyRoute);
api.route("/api", resultRoute);
api.route("/api", downloadCleanRoute);
api.route("/api", summarizeRoute);
api.route("/api", turnstileRoute);

// 404 fallback for unmatched /api paths
api.all("/api/*", (c) =>
  c.json({ error: "Not found" }, 404)
);

export { api as app };
