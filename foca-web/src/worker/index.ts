// =============================================================================
// FOCA Web - Worker Entry Point (Wrangler v4 / Workers with Static Assets)
// =============================================================================
// This is the main entry point for the Worker. It handles all /api/* requests
// via the Hono app. Static assets (the React SPA) are served automatically
// by the assets configuration in wrangler.toml for non-API routes.
// =============================================================================

import { app } from "./app";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
