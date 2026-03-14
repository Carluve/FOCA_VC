// Cloudflare Workers have crypto.randomUUID() available
export function generateId(): string {
  return crypto.randomUUID();
}
