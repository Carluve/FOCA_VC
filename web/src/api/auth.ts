/**
 * Authentication middleware and route.
 * Simple token-based auth for prototype.
 *
 * Flow:
 * 1. POST /api/auth with { password } body
 * 2. Server compares against AUTH_PASSWORD secret
 * 3. Returns a session token stored in KV with 24h TTL
 * 4. Subsequent requests include Authorization: Bearer <token>
 */

import { Hono } from "hono";
import type { Env } from "../types";

const auth = new Hono<{ Bindings: Env }>();

/** POST /api/auth - Authenticate with password */
auth.post("/", async (c) => {
  const body = await c.req.json<{ password?: string }>().catch(() => ({} as { password?: string }));

  if (!body.password) {
    return c.json({ error: "Password is required" }, 400);
  }

  const expected = c.env.AUTH_PASSWORD;
  if (!expected) {
    return c.json({ error: "Server auth not configured" }, 500);
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(body.password, expected)) {
    return c.json({ error: "Invalid password" }, 401);
  }

  // Generate session token
  const token = crypto.randomUUID();

  // Store in KV with 24h TTL
  await c.env.KV.put(`session:${token}`, "valid", {
    expirationTtl: 86400, // 24 hours
  });

  return c.json({ token, expiresIn: 86400 });
});

/** GET /api/auth/verify - Check if token is valid */
auth.get("/verify", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ valid: false }, 401);
  }

  const token = authHeader.slice(7);
  const session = await c.env.KV.get(`session:${token}`);

  return c.json({ valid: session === "valid" });
});

export default auth;

/** POST /api/auth/logout - Invalidate session */
auth.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await c.env.KV.delete(`session:${token}`);
  }
  return c.json({ ok: true });
});

// ── Helpers ─────────────────────────────────────────────────────

/** Constant-time string comparison */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do work to avoid length-based timing leak
    const encoder = new TextEncoder();
    const aBuf = encoder.encode(a);
    const bBuf = encoder.encode(a); // Compare a to itself to waste time
    crypto.subtle.timingSafeEqual?.(aBuf, bBuf);
    return false;
  }

  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);

  // Use Web Crypto API's timingSafeEqual if available (Workers runtime)
  try {
    return crypto.subtle.timingSafeEqual(aBuf, bBuf);
  } catch {
    // Fallback: manual constant-time comparison
    let result = 0;
    for (let i = 0; i < aBuf.length; i++) {
      result |= aBuf[i] ^ bBuf[i];
    }
    return result === 0;
  }
}
