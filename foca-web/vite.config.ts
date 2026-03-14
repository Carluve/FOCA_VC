import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Security note for the prototype login:
// We read BUILD_TIME_PASSWORD from the environment at BUILD TIME, hash it
// with SHA-256, and inject only the hash into the frontend bundle via
// VITE_LOGIN_HASH. The raw password never appears in the client code.
// At runtime the frontend hashes the user's input and compares hashes.
// This is NOT production security -- it's a demo gate.
// ---------------------------------------------------------------------------
function hashPassword(pw: string): string {
  return createHash("sha256").update(pw).digest("hex");
}

export default defineConfig(({ mode }) => {
  const password = process.env.BUILD_TIME_PASSWORD ?? "chema";
  const hashed = hashPassword(password);

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
    define: {
      "import.meta.env.VITE_LOGIN_HASH": JSON.stringify(hashed),
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8788",
          changeOrigin: true,
        },
      },
    },
  };
});
