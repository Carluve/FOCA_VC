/// <reference types="vite/client" />

// Cloudflare bindings available in the Worker
interface Env {
  DB: D1Database;
  R2: R2Bucket;
  CACHE: KVNamespace;
  AI: Ai;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  BUILD_TIME_PASSWORD?: string;
  TURNSTILE_SECRET_KEY?: string;
}

// Vite environment variables (injected at build time)
interface ImportMetaEnv {
  readonly VITE_LOGIN_HASH: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
