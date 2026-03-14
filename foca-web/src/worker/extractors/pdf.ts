// =============================================================================
// PDF Metadata Extractor
// =============================================================================
// Extracts metadata from PDF files using lightweight parsing compatible
// with the Cloudflare Workers runtime (no Node.js fs dependency).
//
// Strategy: Parse the PDF trailer/info dictionary directly from the raw bytes.
// pdf-parse is NOT compatible with Workers (it depends on Node fs), so we
// implement a lightweight extractor that reads the /Info dictionary.
// =============================================================================

import { type ExtractedMetadata, emptyMetadata } from "./types";

// Regex patterns to extract values from the PDF /Info dictionary
const INFO_PATTERNS: Record<string, RegExp> = {
  title: /\/Title\s*\(([^)]*)\)/i,
  author: /\/Author\s*\(([^)]*)\)/i,
  subject: /\/Subject\s*\(([^)]*)\)/i,
  creator: /\/Creator\s*\(([^)]*)\)/i,
  producer: /\/Producer\s*\(([^)]*)\)/i,
  creationDate: /\/CreationDate\s*\(([^)]*)\)/i,
  modificationDate: /\/ModDate\s*\(([^)]*)\)/i,
};

// Patterns for extracting interesting strings from the full document
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const UNC_PATH_REGEX = /\\\\[A-Za-z0-9._-]+\\[A-Za-z0-9._\\/-]+/g;
const WINDOWS_PATH_REGEX = /[A-Z]:\\(?:[A-Za-z0-9._-]+\\)+[A-Za-z0-9._-]*/g;
const UNIX_PATH_REGEX = /\/(?:home|Users|tmp|var|etc)\/[A-Za-z0-9._\/-]+/g;

export function extractPdfMetadata(buffer: ArrayBuffer): ExtractedMetadata {
  const meta = emptyMetadata();
  const decoder = new TextDecoder("latin1");
  const text = decoder.decode(buffer);

  // --- Extract /Info dictionary fields ---
  for (const [key, pattern] of Object.entries(INFO_PATTERNS)) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = decodePdfString(match[1]).trim();
      if (value) {
        (meta as unknown as Record<string, unknown>)[key] = value;
        meta.raw[`pdf.${key}`] = value;
      }
    }
  }

  // Identify application from Creator/Producer
  meta.application = meta.creator || meta.producer || undefined;
  if (meta.application) {
    meta.operatingSystem = guessOS(meta.application);
  }

  // If we found an author, add to users list
  if (meta.author && !meta.users.includes(meta.author)) {
    meta.users.push(meta.author);
  }

  // --- Scan full document text for emails, paths, etc. ---
  const emails = new Set<string>();
  for (const m of text.matchAll(EMAIL_REGEX)) {
    // Filter out common false positives
    if (!m[0].endsWith(".png") && !m[0].endsWith(".jpg")) {
      emails.add(m[0]);
    }
  }
  meta.emails = [...emails];

  const paths = new Set<string>();
  for (const m of text.matchAll(UNC_PATH_REGEX)) paths.add(m[0]);
  for (const m of text.matchAll(WINDOWS_PATH_REGEX)) paths.add(m[0]);
  for (const m of text.matchAll(UNIX_PATH_REGEX)) paths.add(m[0]);
  meta.paths = [...paths];

  // Extract possible usernames from Windows paths
  for (const p of meta.paths) {
    const winUser = p.match(/[Cc]:\\Users\\([^\\]+)/);
    if (winUser?.[1] && !meta.users.includes(winUser[1])) {
      meta.users.push(winUser[1]);
    }
    const macUser = p.match(/\/Users\/([^/]+)/);
    if (macUser?.[1] && !meta.users.includes(macUser[1])) {
      meta.users.push(macUser[1]);
    }
  }

  // Extract server names from UNC paths
  for (const p of meta.paths) {
    const server = p.match(/^\\\\([^\\]+)/);
    if (server?.[1] && !meta.servers.includes(server[1])) {
      meta.servers.push(server[1]);
    }
  }

  return meta;
}

// Decode PDF escaped characters
function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\")
    .replace(/\\([()])/g, "$1");
}

// Guess OS from application string
function guessOS(app: string): string | undefined {
  const lower = app.toLowerCase();
  if (lower.includes("microsoft") || lower.includes("word") || lower.includes("excel")) {
    return "Windows";
  }
  if (lower.includes("mac") || lower.includes("quartz") || lower.includes("preview")) {
    return "macOS";
  }
  if (lower.includes("linux") || lower.includes("libreoffice") || lower.includes("openoffice")) {
    return "Linux";
  }
  return undefined;
}
