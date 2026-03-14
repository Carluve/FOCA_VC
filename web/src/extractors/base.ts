/**
 * Base extractor interface and factory.
 * Mirrors C# DocumentExtractor.Create(extension, stream) pattern.
 */

import type { FileMetadata, LogEntry } from "../types";
import { getExtension, createLogger, createEmptyMetadata } from "../lib/metadata";
import { extractPDF } from "./pdf";
import { extractOOXML } from "./ooxml";
import { extractExif } from "./exif";

/** Supported file extensions grouped by extractor */
const SUPPORTED_EXTENSIONS: Record<string, string[]> = {
  pdf: [".pdf"],
  ooxml: [".docx", ".xlsx", ".pptx", ".ppsx"],
  exif: [".jpg", ".jpeg", ".png", ".tiff", ".tif"],
};

export function isSupportedExtension(ext: string): boolean {
  return Object.values(SUPPORTED_EXTENSIONS).some((exts) =>
    exts.includes(ext.toLowerCase())
  );
}

export function getSupportedExtensions(): string[] {
  return Object.values(SUPPORTED_EXTENSIONS).flat();
}

export interface ExtractionResult {
  metadata: FileMetadata;
  log: LogEntry[];
}

/**
 * Main entry point: analyze a file buffer and return extracted metadata.
 * Mirrors DocumentExtractor.Create() + AnalyzeFile().
 */
export async function analyzeFile(
  filename: string,
  buffer: ArrayBuffer
): Promise<ExtractionResult> {
  const ext = getExtension(filename);
  const { entries, log } = createLogger();

  log(`Starting analysis of "${filename}" (${formatBytes(buffer.byteLength)})`);
  log(`Detected file extension: ${ext}`);

  const metadata = createEmptyMetadata();

  try {
    if (SUPPORTED_EXTENSIONS.pdf.includes(ext)) {
      log("Using PDF extractor");
      await extractPDF(buffer, metadata, log);
    } else if (SUPPORTED_EXTENSIONS.ooxml.includes(ext)) {
      log(`Using Office Open XML extractor for ${ext}`);
      await extractOOXML(buffer, ext, metadata, log);
    } else if (SUPPORTED_EXTENSIONS.exif.includes(ext)) {
      log("Using EXIF/image extractor");
      await extractExif(buffer, metadata, log);
    } else {
      log(`Unsupported file type: ${ext}`, "error");
      throw new Error(`Unsupported file type: ${ext}`);
    }

    // Summary
    const counts = [
      metadata.users.length && `${metadata.users.length} user(s)`,
      metadata.emails.length && `${metadata.emails.length} email(s)`,
      metadata.applications.length && `${metadata.applications.length} application(s)`,
      metadata.paths.length && `${metadata.paths.length} path(s)`,
      metadata.printers.length && `${metadata.printers.length} printer(s)`,
      metadata.history.length && `${metadata.history.length} history entries`,
    ]
      .filter(Boolean)
      .join(", ");

    log(`Extraction complete. Found: ${counts || "no metadata"}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Extraction failed: ${msg}`, "error");
    throw err;
  }

  return { metadata, log: entries };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
