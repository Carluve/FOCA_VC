// =============================================================================
// Office Open XML (.docx, .xlsx, .pptx) Metadata Extractor
// =============================================================================
// OOXML files are ZIP archives containing XML files.
// We use JSZip (which works in Workers) to unzip and parse:
//   - docProps/core.xml   (Dublin Core: author, title, dates, etc.)
//   - docProps/app.xml    (Application info: Word version, company, etc.)
// =============================================================================

import JSZip from "jszip";
import { type ExtractedMetadata, emptyMetadata } from "./types";

// Simple XML text extractor - gets content between tags
function xmlText(xml: string, tag: string): string | undefined {
  // Handles both <tag>value</tag> and <ns:tag>value</ns:tag>
  const re = new RegExp(`<(?:\\w+:)?${tag}[^>]*>([^<]*)<\\/(?:\\w+:)?${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1]?.trim() || undefined;
}

// Extract all matches of a tag (for repeated elements)
function xmlAllText(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:\\w+:)?${tag}[^>]*>([^<]*)<\\/(?:\\w+:)?${tag}>`, "gi");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    if (m[1]?.trim()) results.push(m[1].trim());
  }
  return results;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const UNC_PATH_REGEX = /\\\\[A-Za-z0-9._-]+\\[A-Za-z0-9._\\/-]+/g;
const WINDOWS_PATH_REGEX = /[A-Z]:\\(?:[A-Za-z0-9._-]+\\)+[A-Za-z0-9._-]*/g;

export async function extractOfficeMetadata(
  buffer: ArrayBuffer,
): Promise<ExtractedMetadata> {
  const meta = emptyMetadata();

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    meta.warnings.push("Failed to open file as ZIP/OOXML archive");
    return meta;
  }

  // --- Parse docProps/core.xml (Dublin Core metadata) ---
  const coreFile = zip.file("docProps/core.xml");
  if (coreFile) {
    const coreXml = await coreFile.async("string");

    meta.title = xmlText(coreXml, "title");
    meta.subject = xmlText(coreXml, "subject");
    meta.author = xmlText(coreXml, "creator");
    meta.creationDate = xmlText(coreXml, "created");
    meta.modificationDate = xmlText(coreXml, "modified");

    // "lastModifiedBy" often reveals another username
    const lastModifiedBy = xmlText(coreXml, "lastModifiedBy");
    if (meta.author) meta.users.push(meta.author);
    if (lastModifiedBy && lastModifiedBy !== meta.author) {
      meta.users.push(lastModifiedBy);
    }

    // Keywords and description can contain interesting data
    const keywords = xmlText(coreXml, "keywords");
    if (keywords) meta.raw["dc.keywords"] = keywords;

    const description = xmlText(coreXml, "description");
    if (description) meta.raw["dc.description"] = description;

    // Revision number
    const revision = xmlText(coreXml, "revision");
    if (revision) meta.raw["cp.revision"] = revision;

    // Store all raw values
    if (meta.title) meta.raw["dc.title"] = meta.title;
    if (meta.subject) meta.raw["dc.subject"] = meta.subject;
    if (meta.author) meta.raw["dc.creator"] = meta.author;
    if (meta.creationDate) meta.raw["dcterms.created"] = meta.creationDate;
    if (meta.modificationDate) meta.raw["dcterms.modified"] = meta.modificationDate;
    if (lastModifiedBy) meta.raw["cp.lastModifiedBy"] = lastModifiedBy;
  }

  // --- Parse docProps/app.xml (Application metadata) ---
  const appFile = zip.file("docProps/app.xml");
  if (appFile) {
    const appXml = await appFile.async("string");

    meta.application = xmlText(appXml, "Application");
    meta.appVersion = xmlText(appXml, "AppVersion");

    const company = xmlText(appXml, "Company");
    if (company) meta.raw["app.Company"] = company;

    const manager = xmlText(appXml, "Manager");
    if (manager) {
      meta.raw["app.Manager"] = manager;
      if (!meta.users.includes(manager)) meta.users.push(manager);
    }

    const template = xmlText(appXml, "Template");
    if (template) meta.raw["app.Template"] = template;

    const totalTime = xmlText(appXml, "TotalTime");
    if (totalTime) meta.raw["app.TotalTime"] = totalTime;

    if (meta.application) meta.raw["app.Application"] = meta.application;
    if (meta.appVersion) meta.raw["app.AppVersion"] = meta.appVersion;
  }

  // --- Guess OS from application name ---
  if (meta.application) {
    meta.operatingSystem = guessOS(meta.application, meta.appVersion);
  }

  // --- Scan all XML content for emails, paths, printers ---
  const allTextParts: string[] = [];
  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    // Only scan XML and rels files, skip binary/media
    if (path.endsWith(".xml") || path.endsWith(".rels")) {
      try {
        allTextParts.push(await file.async("string"));
      } catch {
        // skip unreadable files
      }
    }
  }
  const fullText = allTextParts.join("\n");

  // Emails
  const emails = new Set<string>();
  for (const m of fullText.matchAll(EMAIL_REGEX)) {
    if (!m[0].includes("schemas.openxmlformats") && !m[0].includes("schemas.microsoft")) {
      emails.add(m[0]);
    }
  }
  meta.emails = [...emails];

  // Paths
  const paths = new Set<string>();
  for (const m of fullText.matchAll(UNC_PATH_REGEX)) paths.add(m[0]);
  for (const m of fullText.matchAll(WINDOWS_PATH_REGEX)) paths.add(m[0]);
  meta.paths = [...paths];

  // Printers: look for printer references in settings
  const printerSettings = Object.keys(zip.files).filter((p) =>
    p.toLowerCase().includes("printersettings"),
  );
  if (printerSettings.length > 0) {
    meta.printers.push(`${printerSettings.length} printer setting(s) embedded`);
    for (const ps of printerSettings) {
      meta.raw[`printerSettingsFile.${ps}`] = "present";
    }
  }

  // Extract usernames from paths
  for (const p of meta.paths) {
    const winUser = p.match(/[Cc]:\\Users\\([^\\]+)/);
    if (winUser?.[1] && !meta.users.includes(winUser[1])) {
      meta.users.push(winUser[1]);
    }
  }

  // Extract servers from UNC paths
  for (const p of meta.paths) {
    const server = p.match(/^\\\\([^\\]+)/);
    if (server?.[1] && !meta.servers.includes(server[1])) {
      meta.servers.push(server[1]);
    }
  }

  return meta;
}

function guessOS(app: string, version?: string): string | undefined {
  const lower = app.toLowerCase();
  if (lower.includes("microsoft")) {
    // Office version heuristic
    if (version) {
      const major = parseInt(version.split(".")[0], 10);
      if (major >= 16) return "Windows (Office 2016+/365)";
      if (major >= 15) return "Windows (Office 2013)";
      if (major >= 14) return "Windows (Office 2010)";
    }
    if (lower.includes("macintosh") || lower.includes("mac")) return "macOS";
    return "Windows";
  }
  if (lower.includes("libreoffice")) return "Linux/Cross-platform (LibreOffice)";
  if (lower.includes("openoffice")) return "Linux/Cross-platform (OpenOffice)";
  if (lower.includes("google")) return "Cloud (Google Docs)";
  return undefined;
}
