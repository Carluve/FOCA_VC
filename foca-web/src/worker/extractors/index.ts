// =============================================================================
// Metadata extraction dispatcher
// =============================================================================

import { type ExtractedMetadata, emptyMetadata } from "./types";
import { extractPdfMetadata } from "./pdf";
import { extractOfficeMetadata } from "./office";

export type { ExtractedMetadata } from "./types";

const OFFICE_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const OFFICE_EXTENSIONS = new Set([".docx", ".xlsx", ".pptx"]);

/**
 * Main entry point: extract metadata from a file buffer.
 * Dispatches to the correct extractor based on MIME type / extension.
 */
export async function extractMetadata(
  buffer: ArrayBuffer,
  filename: string,
  mimetype: string,
): Promise<ExtractedMetadata> {
  const lower = filename.toLowerCase();

  // PDF
  if (mimetype === "application/pdf" || lower.endsWith(".pdf")) {
    return extractPdfMetadata(buffer);
  }

  // Office Open XML
  if (OFFICE_MIMES.has(mimetype) || OFFICE_EXTENSIONS.has(extensionOf(lower))) {
    return await extractOfficeMetadata(buffer);
  }

  // ZIP-based formats we might support in the future (ODT, ODP, ODS)
  if (lower.endsWith(".odt") || lower.endsWith(".ods") || lower.endsWith(".odp")) {
    // Reuse the Office extractor - ODT also has meta.xml inside a ZIP
    return await extractOfficeMetadata(buffer);
  }

  // Unsupported format
  const meta = emptyMetadata();
  meta.warnings.push(
    `Unsupported file format: ${mimetype} (${filename}). Currently supported: PDF, DOCX, XLSX, PPTX.`,
  );
  return meta;
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : "";
}
