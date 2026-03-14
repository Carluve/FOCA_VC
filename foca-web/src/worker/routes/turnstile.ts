// =============================================================================
// POST /api/turnstile/verify
// Server-side verification of Cloudflare Turnstile tokens.
// =============================================================================

import { Hono } from "hono";
import type { HonoEnv } from "../app";

export const turnstileRoute = new Hono<HonoEnv>();

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

turnstileRoute.post("/turnstile/verify", async (c) => {
  const secretKey = c.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // If no secret key configured, skip verification (dev mode)
    return c.json({ success: true, message: "Turnstile not configured, skipping" });
  }

  let body: { token?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const token = body.token;
  if (!token) {
    return c.json({ success: false, error: "Missing turnstile token" }, 400);
  }

  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);

    // Get the client IP from CF headers
    const ip = c.req.header("CF-Connecting-IP");
    if (ip) {
      formData.append("remoteip", ip);
    }

    const result = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
    });

    const outcome = (await result.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (outcome.success) {
      return c.json({ success: true });
    }

    return c.json(
      {
        success: false,
        error: "Turnstile verification failed",
        codes: outcome["error-codes"],
      },
      403,
    );
  } catch (err) {
    console.error("Turnstile verify error:", err);
    return c.json({ success: false, error: "Verification request failed" }, 500);
  }
});
