import { Hono } from "hono";
import type { HonoEnv } from "../app";

export const healthRoute = new Hono<HonoEnv>();

healthRoute.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "foca-web",
    timestamp: new Date().toISOString(),
  });
});
