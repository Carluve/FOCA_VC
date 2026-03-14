// =============================================================================
// Login Page - Retro hacker terminal aesthetic
// =============================================================================

import { useState, type FormEvent } from "react";
import { sha256 } from "../lib/hash";
import { verifyTurnstile } from "../lib/api";
import { Turnstile } from "../components/Turnstile";
import { Footer } from "../components/Footer";

interface Props {
  onSuccess: () => void;
}

export function LoginPage({ onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const expectedHash = import.meta.env.VITE_LOGIN_HASH;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!turnstileToken) {
        setError("[ERR] Security challenge not completed");
        setLoading(false);
        return;
      }

      const turnstileOk = await verifyTurnstile(turnstileToken);
      if (!turnstileOk) {
        setError("[ERR] Security verification failed");
        setLoading(false);
        return;
      }

      const inputHash = await sha256(password);
      if (inputHash === expectedHash) {
        onSuccess();
      } else {
        setError("[ERR] ACCESS_DENIED: Invalid credentials");
        setPassword("");
      }
    } catch {
      setError("[ERR] Authentication system failure");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] scanlines">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/logo_foca.png"
              alt="FOCA"
              className="mx-auto h-36 mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            />
            <p className="text-foca-500 text-sm font-mono tracking-widest uppercase">
              Metadata Analysis Platform
            </p>
          </div>

          {/* Terminal login box */}
          <div className="bg-[#0d0d0d] border border-foca-900/60 rounded-lg overflow-hidden border-glow">
            {/* Terminal title bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#111] border-b border-foca-900/40">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-foca-500/70" />
              </div>
              <span className="text-foca-600 text-xs font-mono ml-2">
                foca@security:~$ authenticate
              </span>
            </div>

            {/* Terminal body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="text-foca-500/60 text-xs font-mono space-y-1 mb-4">
                <p>FOCA Security System v1.0</p>
                <p>Establishing secure connection...</p>
                <p className="text-foca-400">Connection established. Enter credentials.</p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="flex items-center gap-2 text-sm font-mono text-foca-500 mb-2"
                >
                  <span className="text-foca-700">$</span>
                  password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  autoFocus
                  required
                  className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-foca-900/50 rounded
                             text-foca-300 font-mono placeholder-foca-900
                             focus:outline-none focus:ring-1 focus:ring-foca-600 focus:border-foca-700
                             transition-colors"
                />
              </div>

              {/* Turnstile */}
              <div className="py-1">
                <Turnstile
                  onVerify={(token) => {
                    setTurnstileToken(token);
                    setError("");
                  }}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                  theme="dark"
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm font-mono bg-red-950/30 border border-red-900/50 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password || !turnstileToken}
                className="w-full py-2.5 bg-foca-900/50 hover:bg-foca-800/50 border border-foca-700/50
                           hover:border-foca-500/50 disabled:bg-[#111] disabled:border-gray-800
                           disabled:text-gray-700 text-foca-400 font-mono font-medium rounded
                           transition-all focus:outline-none focus:ring-1 focus:ring-foca-500"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border border-foca-500 border-t-transparent rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  "$ sudo access --grant"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
