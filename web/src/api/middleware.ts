/**
 * Auth middleware: validates Bearer token against KV session store.
 */

import { createMiddleware } from "hono/factory";
import type { Env } from "../types";

export const requireAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const token = authHeader.slice(7);
  const session = await c.env.KV.get(`session:${token}`);

  if (session !== "valid") {
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  await next();
});
