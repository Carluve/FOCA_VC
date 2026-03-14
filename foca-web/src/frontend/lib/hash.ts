// =============================================================================
// Client-side SHA-256 hashing using the Web Crypto API
// Used to hash the user's password input and compare against the build-time
// hash injected by Vite (VITE_LOGIN_HASH).
// =============================================================================

export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
