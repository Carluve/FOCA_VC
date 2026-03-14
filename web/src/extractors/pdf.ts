/**
 * PDF metadata extractor.
 * Mirrors C# PDFDocument: standard info dict + XMP + regex scan for paths/links.
 *
 * Uses pdf-parse-new which works in Node.js-compat mode on Workers.
 * Falls back to raw binary scan if parsing fails.
 */

import type { FileMetadata } from "../types";
import {
  addUser,
  addPath,
  addUnique,
  inferUsersFromPaths,
  extractEmails,
  LINK_REGEX,
} from "../lib/metadata";

export async function extractPDF(
  buffer: ArrayBuffer,
  metadata: FileMetadata,
  log: (msg: string, level?: "info" | "warn" | "error") => void
): Promise<void> {
  // pdf-parse expects a Buffer/Uint8Array
  const uint8 = new Uint8Array(buffer);

  try {
    // Dynamic import - pdf-parse is a CommonJS module
    const pdfParse = (await import("pdf-parse")).default;

    const data = await pdfParse(uint8, {
      // Don't render pages - we only need metadata
      max: 0,
    });

    log("PDF parsed successfully");

    // Standard info dictionary
    const info = data.info || {};
    if (info.Title) metadata.title = info.Title;
    if (info.Subject) metadata.subject = info.Subject;
    if (info.Keywords) metadata.keywords = info.Keywords;

    if (info.Author) {
      addUser(metadata, { value: info.Author, isComputerUser: false });
    }

    if (info.Creator) {
      addUnique(
        metadata.applications.map((a) => a.value) as unknown as string[],
        info.Creator
      );
      metadata.applications.push({ value: info.Creator, source: "PDF Creator" });
    }

    if (info.Producer) {
      metadata.applications.push({ value: info.Producer, source: "PDF Producer" });
    }

    // Dates
    if (info.CreationDate) {
      metadata.dates.creationDate = parsePDFDate(info.CreationDate);
    }
    if (info.ModDate) {
      metadata.dates.modificationDate = parsePDFDate(info.ModDate);
    }

    log(
      `Info dict: Author=${info.Author || "?"}, Creator=${info.Creator || "?"}, Producer=${info.Producer || "?"}`
    );

    // XMP metadata (if present in raw metadata)
    if (data.metadata) {
      try {
        const xmpData = data.metadata as Record<string, unknown>;
        parseXMPObject(xmpData, metadata, log);
      } catch {
        log("XMP metadata parsing skipped", "warn");
      }
    }
  } catch (err) {
    log(
      `pdf-parse failed, falling back to raw scan: ${err instanceof Error ? err.message : err}`,
      "warn"
    );
  }

  // Raw binary scan (always run - catches embedded paths/links)
  rawScanPDF(uint8, metadata, log);

  // Infer users from discovered paths
  inferUsersFromPaths(metadata);
}

/** Parse XMP data from pdf-parse metadata object */
function parseXMPObject(
  xmp: Record<string, unknown>,
  metadata: FileMetadata,
  log: (msg: string, level?: "info" | "warn" | "error") => void
): void {
  const getString = (key: string): string | undefined => {
    const val = xmp[key];
    return typeof val === "string" ? val.trim() : undefined;
  };

  const creator =
    getString("dc:creator") || getString("pdf:author") || getString("xap:author");
  if (creator) addUser(metadata, { value: creator, isComputerUser: false });

  const tool =
    getString("xap:creatortool") || getString("pdf:creator");
  if (tool) metadata.applications.push({ value: tool, source: "XMP" });

  const producer = getString("pdf:producer");
  if (producer) metadata.applications.push({ value: producer, source: "XMP Producer" });

  const title = getString("dc:title") || getString("pdf:title");
  if (title && (!metadata.title || title.length > metadata.title.length)) {
    metadata.title = title;
  }

  log("XMP metadata extracted");
}

/**
 * Raw binary scan of PDF bytes.
 * Mirrors C# PDFDocument regex scan for paths, mailto:, http links.
 */
function rawScanPDF(
  bytes: Uint8Array,
  metadata: FileMetadata,
  log: (msg: string, level?: "info" | "warn" | "error") => void
): void {
  // Decode as latin-1 (preserves all byte values)
  let text: string;
  try {
    const decoder = new TextDecoder("latin1");
    text = decoder.decode(bytes);
  } catch {
    log("Could not decode PDF bytes for raw scan", "warn");
    return;
  }

  // Windows paths: C:\..., \\server\...
  const winPathRegex = /([a-zA-Z]:|\\\\[^\\]+)\\[^\s<>"')\]},;]{3,}/g;
  const pathMatches = text.match(winPathRegex) || [];
  for (const p of pathMatches) {
    addPath(metadata, { value: p, isComputerFolder: true });
  }

  // Unix paths in PDF objects
  const unixPathRegex = /\/(?:home|Users|tmp|var|opt)\/[^\s<>"')\]},;]{3,}/g;
  const unixMatches = text.match(unixPathRegex) || [];
  for (const p of unixMatches) {
    addPath(metadata, { value: p, isComputerFolder: true });
  }

  // Links
  const linkMatches = text.match(LINK_REGEX) || [];
  for (const link of linkMatches) {
    if (link.startsWith("mailto:")) {
      const emails = extractEmails(link);
      for (const e of emails) addUnique(metadata.emails, e);
    } else {
      addPath(metadata, { value: link, isComputerFolder: false });
    }
  }

  if (pathMatches.length || unixMatches.length || linkMatches.length) {
    log(
      `Raw scan found: ${pathMatches.length + unixMatches.length} path(s), ${linkMatches.length} link(s)`
    );
  }
}

/** Parse PDF date format (D:20200101120000+00'00' or ISO) */
function parsePDFDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;

  // Remove PDF date prefix
  const clean = dateStr.replace(/^D:/, "");

  // Try ISO parse
  const d = new Date(clean);
  if (!isNaN(d.getTime())) return d.toISOString();

  // Manual parse: YYYYMMDDHHmmSS
  const m = clean.match(/(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4] || "00"}:${m[5] || "00"}:${m[6] || "00"}Z`;
    const d2 = new Date(iso);
    if (!isNaN(d2.getTime())) return d2.toISOString();
  }

  return dateStr; // Return as-is if unparseable
}
