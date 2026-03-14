/**
 * Shared utilities for metadata extraction.
 * Port of FOCA's PathAnalysis + ApplicationAnalysis logic.
 */

import type { FileMetadata, MetadataUser, MetadataPath, LogEntry } from "../types";

/** Create an empty FileMetadata object */
export function createEmptyMetadata(): FileMetadata {
  return {
    users: [],
    emails: [],
    applications: [],
    printers: [],
    paths: [],
    history: [],
    servers: [],
    passwords: [],
    dates: {},
    embeddedImages: {},
    makernotes: {},
  };
}

/** Extract username from a filesystem path (mirrors PathAnalysis.ExtractUserFromPath) */
export function extractUserFromPath(pathStr: string): string | null {
  // Windows patterns: C:\Users\<name>\..., C:\Documents and Settings\<name>\...
  const winPatterns = [
    /[a-zA-Z]:\\Users\\([^\\]+)/i,
    /[a-zA-Z]:\\Documents and Settings\\([^\\]+)/i,
    /\\\\[^\\]+\\Users\\([^\\]+)/i,
  ];
  for (const pat of winPatterns) {
    const m = pathStr.match(pat);
    if (m?.[1]) {
      const name = m[1].trim();
      if (name && name.toLowerCase() !== "public" && name.toLowerCase() !== "default") {
        return name;
      }
    }
  }

  // Unix patterns: /home/<name>/..., /Users/<name>/...
  const unixPatterns = [/\/home\/([^/]+)/i, /\/Users\/([^/]+)/i];
  for (const pat of unixPatterns) {
    const m = pathStr.match(pat);
    if (m?.[1]) return m[1].trim();
  }

  return null;
}

/** Deduplicate users by case-insensitive value */
export function addUser(metadata: FileMetadata, user: MetadataUser): void {
  const exists = metadata.users.some(
    (u) => u.value.toLowerCase() === user.value.toLowerCase()
  );
  if (!exists && user.value.trim().length > 1 && /[a-zA-Z]/.test(user.value)) {
    metadata.users.push(user);
  }
}

/** Deduplicate paths by case-insensitive value */
export function addPath(metadata: FileMetadata, path: MetadataPath): void {
  const exists = metadata.paths.some(
    (p) => p.value.toLowerCase() === path.value.toLowerCase()
  );
  if (!exists && path.value.trim().length > 0) {
    metadata.paths.push(path);
  }
}

/** Add a string to any string[] field with dedup */
export function addUnique(arr: string[], value: string): void {
  const v = value.trim();
  if (v && !arr.some((x) => x.toLowerCase() === v.toLowerCase())) {
    arr.push(v);
  }
}

/** After extraction, scan all paths for embedded usernames */
export function inferUsersFromPaths(metadata: FileMetadata): void {
  for (const p of metadata.paths) {
    const user = extractUserFromPath(p.value);
    if (user) {
      addUser(metadata, { value: user, isComputerUser: true });
    }
  }
}

/** Detect file extension from filename */
export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

/** Create a structured log helper */
export function createLogger(): { entries: LogEntry[]; log: (msg: string, level?: LogEntry["level"]) => void } {
  const entries: LogEntry[] = [];
  return {
    entries,
    log(msg: string, level: LogEntry["level"] = "info") {
      entries.push({
        timestamp: new Date().toISOString(),
        message: msg,
        level,
      });
    },
  };
}

/** Known link patterns to extract from binary content */
export const LINK_REGEX =
  /(?:mailto:|https?:\/\/|ftp:\/\/|ldap:\/\/|telnet:\/\/|file:\/\/)[^\s<>"')\]},;]+/gi;

/** Extract emails from mailto: links */
export function extractEmails(text: string): string[] {
  const emails: string[] = [];
  const matches = text.match(/mailto:([^\s<>"')\]},;]+)/gi) || [];
  for (const m of matches) {
    const email = m.replace(/^mailto:/i, "").trim();
    if (email.includes("@")) emails.push(email);
  }
  return emails;
}
