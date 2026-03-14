// =============================================================================
// GET /api/download-clean/:id
// Serves a "cleaned" version of the original file with metadata stripped.
//
// For this prototype:
//   - PDF: We serve the original (full PDF metadata stripping requires a
//     dedicated library; noted as a future enhancement).
//   - DOCX/XLSX/PPTX: We rebuild the ZIP without docProps/core.xml and
//     docProps/app.xml, effectively stripping document metadata.
// =============================================================================

import { Hono } from "hono";
import type { HonoEnv } from "../app";
import { getAnalysis, addLog } from "../lib/db";
import JSZip from "jszip";

export const downloadCleanRoute = new Hono<HonoEnv>();

const OFFICE_EXTENSIONS = new Set([".docx", ".xlsx", ".pptx", ".odt", ".ods", ".odp"]);

downloadCleanRoute.get("/download-clean/:id", async (c) => {
  const id = c.req.param("id");

  // --- Lookup analysis ---
  const analysis = await getAnalysis(c.env.DB, id);
  if (!analysis) {
    return c.json({ error: "Analysis not found" }, 404);
  }

  // --- Retrieve original from R2 ---
  const r2Key = `originals/${id}/${analysis.filename}`;
  const r2Object = await c.env.R2.get(r2Key);
  if (!r2Object) {
    return c.json({ error: "Original file not found in storage" }, 404);
  }

  const originalBuffer = await r2Object.arrayBuffer();
  const ext = analysis.filename.toLowerCase().slice(analysis.filename.lastIndexOf("."));

  // --- Clean and serve ---
  if (OFFICE_EXTENSIONS.has(ext)) {
    // For Office Open XML: rebuild ZIP without metadata files
    try {
      const cleaned = await stripOfficeMetadata(originalBuffer);
      await addLog(c.env.DB, id, "Clean file generated (Office metadata stripped)");

      const cleanName = `clean_${analysis.filename}`;
      return new Response(cleaned, {
        headers: {
          "Content-Type": analysis.filetype,
          "Content-Disposition": `attachment; filename="${cleanName}"`,
        },
      });
    } catch (err) {
      console.error("Clean generation error:", err);
      // Fall through to serve original
    }
  }

  if (ext === ".pdf") {
    // For PDF: strip /Info dictionary metadata values using binary rewriting
    try {
      const cleaned = stripPdfMetadata(originalBuffer);
      await addLog(c.env.DB, id, "Clean file generated (PDF /Info metadata stripped)");

      const cleanName = `clean_${analysis.filename}`;
      return new Response(cleaned, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${cleanName}"`,
        },
      });
    } catch (err) {
      console.error("PDF clean error:", err);
      await addLog(c.env.DB, id, "PDF metadata stripping failed, serving original", "warn");
      // Fall through to serve original
    }
  }

  // Fallback: serve original
  const cleanName = `clean_${analysis.filename}`;
  return new Response(originalBuffer, {
    headers: {
      "Content-Type": analysis.filetype,
      "Content-Disposition": `attachment; filename="${cleanName}"`,
      "X-Foca-Warning": "File served without metadata stripping for this format",
    },
  });
});

/**
 * Strip metadata from an Office Open XML file by removing:
 *   - docProps/core.xml (author, title, dates, etc.)
 *   - docProps/app.xml (application info, company, etc.)
 *   - docProps/custom.xml (custom properties)
 * and updating the [Content_Types].xml to remove references.
 */
async function stripOfficeMetadata(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(buffer);

  // Remove metadata files
  const toRemove = [
    "docProps/core.xml",
    "docProps/app.xml",
    "docProps/custom.xml",
  ];

  for (const path of toRemove) {
    if (zip.file(path)) {
      zip.remove(path);
    }
  }

  // Remove the docProps directory if it's now empty
  const remaining = Object.keys(zip.files).filter((f) =>
    f.startsWith("docProps/"),
  );
  if (remaining.length === 0) {
    zip.remove("docProps/");
  }

  // Update [Content_Types].xml to remove references to deleted parts
  const contentTypesFile = zip.file("[Content_Types].xml");
  if (contentTypesFile) {
    let ct = await contentTypesFile.async("string");
    // Remove Override entries pointing to docProps
    ct = ct.replace(
      /<Override[^>]*PartName="\/docProps\/[^"]*"[^>]*\/>/g,
      "",
    );
    zip.file("[Content_Types].xml", ct);
  }

  // Update _rels/.rels to remove relationships to docProps
  const relsFile = zip.file("_rels/.rels");
  if (relsFile) {
    let rels = await relsFile.async("string");
    rels = rels.replace(
      /<Relationship[^>]*Target="docProps\/[^"]*"[^>]*\/>/g,
      "",
    );
    zip.file("_rels/.rels", rels);
  }

  return await zip.generateAsync({ type: "arraybuffer" });
}

/**
 * Strip metadata from a PDF by replacing /Info dictionary values with empty strings.
 * This works by finding metadata fields (Title, Author, Subject, Creator, Producer,
 * CreationDate, ModDate, Keywords, Company) in the raw PDF bytes and replacing their
 * parenthesized values with empty parens.
 *
 * This approach avoids needing a full PDF parser (which requires Node fs) and works
 * within the Cloudflare Workers runtime.
 */
function stripPdfMetadata(buffer: ArrayBuffer): ArrayBuffer {
  const decoder = new TextDecoder("latin1");
  let text = decoder.decode(buffer);

  // Fields to strip from the /Info dictionary
  const fieldsToStrip = [
    "Title",
    "Author",
    "Subject",
    "Keywords",
    "Creator",
    "Producer",
    "CreationDate",
    "ModDate",
    "Company",
    "Manager",
    "SourceModified",
  ];

  for (const field of fieldsToStrip) {
    // Match /FieldName (value) - parenthesized strings
    const parenRegex = new RegExp(
      `(\\/${field}\\s*)\\(([^)]*)\\)`,
      "g",
    );
    text = text.replace(parenRegex, `$1()`);

    // Match /FieldName <hex value> - hex strings
    const hexRegex = new RegExp(
      `(\\/${field}\\s*)<([0-9A-Fa-f]*)>`,
      "g",
    );
    text = text.replace(hexRegex, `$1<>`);
  }

  // Also strip XMP metadata block if present (between <x:xmpmeta and </x:xmpmeta>)
  text = text.replace(
    /<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/g,
    '<x:xmpmeta xmlns:x="adobe:ns:meta/"></x:xmpmeta>',
  );

  // Encode back to binary
  const encoder = new TextEncoder();
  // We need latin1 encoding to preserve binary data; TextEncoder only does UTF-8.
  // Use a Uint8Array with charCodeAt for proper latin1 roundtrip.
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i);
  }

  return bytes.buffer;
}
