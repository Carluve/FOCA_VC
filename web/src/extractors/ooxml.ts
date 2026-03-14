/**
 * Office Open XML metadata extractor (.docx, .xlsx, .pptx, .ppsx).
 * Mirrors C# OfficeOpenXMLDocument: reads ZIP, parses core.xml + app.xml,
 * scans for printers, hyperlinks, embedded images.
 */

import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { FileMetadata } from "../types";
import {
  addUser,
  addPath,
  addUnique,
  inferUsersFromPaths,
  extractEmails,
  LINK_REGEX,
} from "../lib/metadata";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
  trimValues: true,
});

export async function extractOOXML(
  buffer: ArrayBuffer,
  ext: string,
  metadata: FileMetadata,
  log: (msg: string, level?: "info" | "warn" | "error") => void
): Promise<void> {
  let zip: JSZip;

  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (err) {
    throw new Error(`Failed to open as ZIP: ${err instanceof Error ? err.message : err}`);
  }

  log("ZIP archive opened successfully");

  // 1. Parse docProps/core.xml (Dublin Core metadata)
  await parseCoreXml(zip, metadata, log);

  // 2. Parse docProps/app.xml (Application metadata)
  await parseAppXml(zip, metadata, log);

  // 3. Format-specific extraction
  if (ext === ".docx") {
    await parseDocx(zip, metadata, log);
  } else if (ext === ".xlsx") {
    await parseXlsx(zip, metadata, log);
  } else if (ext === ".pptx" || ext === ".ppsx") {
    await parsePptx(zip, metadata, log);
  }

  // 4. Scan all .rels files for hyperlinks
  await scanRels(zip, metadata, log);

  // 5. Look for embedded images (EXIF potential)
  await scanEmbeddedMedia(zip, metadata, log);

  // Infer users from paths
  inferUsersFromPaths(metadata);
}

// ── Core.xml (Dublin Core) ──────────────────────────────────────

async function parseCoreXml(
  zip: JSZip,
  metadata: FileMetadata,
  log: (msg: string, level?: "info" | "warn" | "error") => void
): Promise<void> {
  const coreFile = zip.file("docProps/core.xml");
  if (!coreFile) {
    log("No docProps/core.xml found", "warn");
    return;
  }

  const xml = await coreFile.async("text");
  const parsed = xmlParser.parse(xml);
  const props = parsed?.["cp:coreProperties"] || parsed?.["coreProperties"] || {};

  // Creator
  const creator = getTextValue(props["dc:creator"]);
  if (creator) addUser(metadata, { value: creator, isComputerUser: false });

  // Last modified by
  const lastModBy = getTextValue(props["cp:lastModifiedBy"]);
  if (lastModBy) addUser(metadata, { value: lastModBy, isComputerUser: false });

  // Title, subject, description
  const title = getTextValue(props["dc:title"]);
  if (title) metadata.title = title;

  const subject = getTextValue(props["dc:subject"]);
  if (subject) metadata.subject = subject;

  const description = getTextValue(props["dc:description"]);
  if (description) metadata.description = description;

  // Keywords, category, language
  const keywords = getTextValue(props["cp:keywords"]);
  if (keywords) metadata.keywords = keywords;

  const category = getTextValue(props["cp:category"]);
  if (category) metadata.category = category;

  const language = getTextValue(props["dc:language"]);
  if (language) metadata.language = language;

  // Dates
  const created = getTextValue(props["dcterms:created"]);
  if (created) metadata.dates.creationDate = created;

  const modified = getTextValue(props["dcterms:modified"]);
  if (modified) metadata.dates.modificationDate = modified;

  const printed = getTextValue(props["cp:lastPrinted"]);
  if (printed) metadata.dates.printingDate = printed;

  // Revision
  const revision = getTextValue(props["cp:revision"]);
  if (revision) {
    metadata.history.push({
      value: `Revision ${revision}`,
      comments: `Document has been revised ${revision} time(s)`,
    });
  }

  log("core.xml parsed");
}

// ── App.xml (Application info) ──────────────────────────────────

async function parseAppXml(
  zip: JSZip,
  metadata: FileMetadata,
  log: (msg: string, level?: "info" | "warn" | "error") => void
): Promise<void> {
  const appFile = zip.file("docProps/app.xml");
  if (!appFile) {
    log("No docProps/app.xml found", "warn");
    return;
  }

  const xml = await appFile.async("text");
  const parsed = xmlParser.parse(xml);
  const props = parsed?.["Properties"] || {};

  // Application
  const app = getTextValue(props["Application"]);
  const appVersion = getTextValue(props["AppVersion"]);
  if (app) {
    const fullApp = appVersion ? `${app} ${appVersion}` : app;
    metadata.applications.push({ value: fullApp, source: "app.xml" });
  }

  // Company
  const company = getTextValue(props["Company"]);
  if (company) metadata.company = company;

  // Manager → User
  const manager = getTextValue(props["Manager"]);
  if (manager) addUser(metadata, { value: manager, isComputerUser: false });

  // Template
  const template = getTextValue(props["Template"]);
  if (template) metadata.template = template;

  // Statistics
  const pages = getTextValue(props["Pages"]);
  const words = getTextValue(props["Words"]);
  const chars = getTextValue(props["Characters"]);
  const lines = getTextValue(props["Lines"]);
  const paragraphs = getTextValue(props["Paragraphs"]);
  const stats = [
    pages && `Pages: ${pages}`,
    words && `Words: ${words}`,
    chars && `Characters: ${chars}`,
    lines && `Lines: ${lines}`,
    paragraphs && `Paragraphs: ${paragraphs}`,
  ]
    .filter(Boolean)
    .join(", ");
  if (stats) metadata.statistic = stats;

  // Total editing time
  const totalTime = getTextValue(props["TotalTime"]);
  if (totalTime) {
    metadata.history.push({
      value: `Total editing time: ${totalTime} minutes`,
    });
  }

  log("app.xml parsed");
}

// ── DOCX-specific ───────────────────────────────────────────────

async function parseDocx(
  zip: JSZip,
  metadata: FileMetadata,
  log: (msg: string, level?: "info" | "warn" | "error") => void
): Promise<void> {
  // Settings (language)
  const settingsFile = zip.file("word/settings.xml");
  if (settingsFile) {
    try {
      const xml = await settingsFile.async("text");
      const langMatch = xml.match(/w:val="([a-zA-Z-]+)"/);
      if (langMatch && !metadata.language) {
        metadata.language = langMatch[1];
      }
    } catch {
      // Ignore
    }
  }

  // Document.xml - scan for tracked changes (revision authors)
  const docFile = zip.file("word/document.xml");
  if (docFile) {
    try {
      const xml = await docFile.async("text");
      // Track change authors
      const authorMatches = xml.matchAll(/w:author="([^"]+)"/g);
      for (const m of authorMatches) {
        addUser(metadata, { value: m[1], isComputerUser: false, notes: "revision author" });
      }
    } catch {
      // Ignore
    }
  }

  log("DOCX-specific extraction done");
}

// ── XLSX-specific ───────────────────────────────────────────────

async function parseXlsx(
  zip: JSZip,
  metadata: FileMetadata,
  log: (msg: string, level?: "info" | "warn" | "error") => void
): Promise<void> {
  // Scan printerSettings for printer names
  const printerFiles = zip.file(/printerSettings/);
  for (const pf of printerFiles) {
    try {
      const bytes = await pf.async("uint8array");
      const text = new TextDecoder("latin1").decode(bytes);
      // Printer names are typically null-terminated strings at the start
      const printerName = text.split("\0").find((s) => s.length > 2 && /[a-zA-Z]/.test(s));
      if (printerName) {
        addUnique(metadata.printers, printerName.trim());
      }
    } catch {
      // Ignore binary parse errors
    }
  }

  log("XLSX-specific extraction done");
}

// ── PPTX-specific ───────────────────────────────────────────────

async function parsePptx(
  zip: JSZip,
  metadata: FileMetadata,
  log: (msg: string, level?: "info" | "warn" | "error") => void
): Promise<void> {
  // Scan slide rels for hyperlinks
  const slideRels = zip.file(/ppt\/slides\/_rels\//);
  for (const rel of slideRels) {
    try {
      const xml = await rel.async("text");
      const targets = xml.matchAll(/Target="([^"]+)"/g);
      for (const m of targets) {
        const target = m[1];
        if (target.startsWith("http") || target.startsWith("mailto:")) {
          if (target.startsWith("mailto:")) {
            const emails = extractEmails(target);
            for (const e of emails) addUnique(metadata.emails, e);
          } else {
            addPath(metadata, { value: target, isComputerFolder: false });
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  log("PPTX-specific extraction done");
}

// ── Shared: Scan .rels for hyperlinks ───────────────────────────

async function scanRels(
  zip: JSZip,
  metadata: FileMetadata,
  log: (msg: string, level?: "info" | "warn" | "error") => void
): Promise<void> {
  const relsFiles = zip.file(/\.rels$/);
  let linkCount = 0;

  for (const rel of relsFiles) {
    try {
      const xml = await rel.async("text");
      const targets = xml.matchAll(
        /TargetMode="External"\s+Target="([^"]+)"|Target="([^"]+)"\s+TargetMode="External"/g
      );
      for (const m of targets) {
        const target = m[1] || m[2];
        if (!target) continue;

        if (target.startsWith("mailto:")) {
          const emails = extractEmails(target);
          for (const e of emails) addUnique(metadata.emails, e);
          linkCount++;
        } else if (target.match(/^https?:\/\//)) {
          addPath(metadata, { value: target, isComputerFolder: false });
          linkCount++;
        }
      }
    } catch {
      // Ignore
    }
  }

  if (linkCount) log(`Found ${linkCount} external link(s) in .rels files`);
}

// ── Shared: Scan for embedded media ─────────────────────────────

async function scanEmbeddedMedia(
  zip: JSZip,
  metadata: FileMetadata,
  log: (msg: string, level?: "info" | "warn" | "error") => void
): Promise<void> {
  const mediaFiles = zip.file(/\.(jpg|jpeg|png)$/i);
  if (mediaFiles.length) {
    log(
      `Found ${mediaFiles.length} embedded image(s) - EXIF extraction available in future version`
    );
    // In a full implementation, we'd extract EXIF from each embedded image
    // and merge the metadata. For now, just note their presence.
  }
}

// ── Utilities ───────────────────────────────────────────────────

function getTextValue(val: unknown): string | undefined {
  if (typeof val === "string") return val.trim() || undefined;
  if (typeof val === "number") return String(val);
  if (val && typeof val === "object") {
    // Handle XML text nodes: { "#text": "value" }
    const obj = val as Record<string, unknown>;
    if (typeof obj["#text"] === "string") return obj["#text"].trim() || undefined;
  }
  return undefined;
}
