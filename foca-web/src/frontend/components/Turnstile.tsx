// =============================================================================
// Cloudflare Turnstile widget (lightweight, no external dependency)
// =============================================================================

import { useEffect, useRef, useCallback } from "react";

// Site key: public, safe to embed in client code.
const SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAACqSXlsKI_HWpqiA";

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: (codes?: string[]) => void;
  onExpire?: () => void;
  theme?: "dark" | "light" | "auto";
}

type TurnstileWindow = {
  turnstile?: {
    render: (el: HTMLElement, opts: Record<string, unknown>) => string;
    remove: (id: string) => void;
    reset: (id: string) => void;
  };
};

// Track if the script is already loaded/loading
let scriptLoaded = false;
let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${TURNSTILE_SCRIPT_URL}?render=explicit`;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function Turnstile({
  onVerify,
  onError,
  onExpire,
  theme = "dark",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const handleVerify = useCallback((token: string) => {
    onVerify(token);
  }, [onVerify]);

  const handleExpire = useCallback(() => {
    // Token expired: reset so user can complete the challenge again
    const w = window as unknown as TurnstileWindow;
    if (widgetIdRef.current && w.turnstile) {
      w.turnstile.reset(widgetIdRef.current);
    }
    onExpire?.();
  }, [onExpire]);

  const handleError = useCallback((errorCode?: string) => {
    console.warn("[Turnstile] widget error:", errorCode);
    // Auto-reset on error so the user can retry without refreshing
    const w = window as unknown as TurnstileWindow;
    if (widgetIdRef.current && w.turnstile) {
      try {
        w.turnstile.reset(widgetIdRef.current);
      } catch {
        // ignore
      }
    }
    onError?.(errorCode ? [errorCode] : []);
  }, [onError]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await loadTurnstileScript();
      } catch {
        console.error("[Turnstile] Failed to load script");
        onError?.(["script-load-failed"]);
        return;
      }

      if (!mounted || !containerRef.current) return;

      const w = window as unknown as TurnstileWindow;
      if (!w.turnstile) {
        onError?.(["turnstile-not-available"]);
        return;
      }

      // Clean up any previous widget
      if (widgetIdRef.current) {
        try {
          w.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }

      widgetIdRef.current = w.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme,
        // "managed" is the default: Cloudflare decides whether to show a
        // checkbox or run silently. Do NOT use "interaction-only" with
        // production keys as it can trigger spurious error callbacks.
        appearance: "always",
        callback: handleVerify,
        "expired-callback": handleExpire,
        "error-callback": handleError,
      });
    }

    init();

    return () => {
      mounted = false;
      const w = window as unknown as TurnstileWindow;
      if (widgetIdRef.current && w.turnstile) {
        try {
          w.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, [handleVerify, handleExpire, handleError, theme]);

  return <div ref={containerRef} className="flex justify-center" />;
}
