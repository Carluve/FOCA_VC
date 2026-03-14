// =============================================================================
// POST /api/summarize/:id
// Uses Workers AI (routed through AI Gateway "foca-v1") to generate a
// human-readable summary of the extracted metadata for an analysis.
// =============================================================================

import { Hono } from "hono";
import type { HonoEnv } from "../app";
import { getAnalysis, addLog, saveSummary } from "../lib/db";

export const summarizeRoute = new Hono<HonoEnv>();

// AI Gateway endpoint for the "foca-v1" gateway
const AI_GATEWAY_ID = "foca-v1";

summarizeRoute.post("/summarize/:id", async (c) => {
  const id = c.req.param("id");

  // --- Lookup analysis ---
  const analysis = await getAnalysis(c.env.DB, id);
  if (!analysis) {
    return c.json({ error: "Analysis not found" }, 404);
  }

  if (analysis.status !== "completed" || !analysis.metadata) {
    return c.json({ error: "Analysis is not completed or has no metadata" }, 400);
  }

  // --- Return cached summary if it already exists ---
  if (analysis.ai_summary) {
    return c.json({ summary: analysis.ai_summary, cached: true });
  }

  // Parse metadata
  let metadata: Record<string, unknown>;
  try {
    metadata = JSON.parse(analysis.metadata);
  } catch {
    return c.json({ error: "Invalid metadata format" }, 500);
  }

  // --- Build prompt ---
  const prompt = buildSummaryPrompt(analysis.filename, metadata);

  try {
    await addLog(c.env.DB, id, "AI summary requested via AI Gateway (foca-v1)");

    // Run inference through Workers AI binding.
    // The AI Gateway "foca-v1" must be configured in the Cloudflare dashboard
    // to route through for observability, caching, and logging.
    // Using @cf/meta/llama-3.3-70b-instruct-fp8-fast - the most capable model
    // available on Workers AI for high-quality security summaries.
    const response = await c.env.AI.run(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      {
        messages: [
          {
            role: "system",
            content:
              "You are a cybersecurity analyst specialized in document metadata analysis (OSINT). " +
              "Analyze the extracted metadata and provide a concise, actionable security summary in Spanish. " +
              "Highlight potential information leaks: usernames, email addresses, internal paths, " +
              "server names, software versions, and operating systems. " +
              "Be direct and professional. Use bullet points for findings.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1024,
      },
      {
        gateway: {
          id: AI_GATEWAY_ID,
          skipCache: false,
        },
      },
    );

    const summary =
      (response as { response?: string }).response ??
      "No se pudo generar el resumen.";

    // Persist the summary in D1 so it loads automatically on future views
    await saveSummary(c.env.DB, id, summary);
    await addLog(c.env.DB, id, "AI summary generated and saved");

    return c.json({ summary, cached: false });
  } catch (err) {
    console.error("AI summarize error:", err);
    const message = err instanceof Error ? err.message : "AI inference failed";
    await addLog(c.env.DB, id, `AI summary failed: ${message}`, "error");
    return c.json({ error: `AI summary failed: ${message}` }, 500);
  }
});

/**
 * Build a structured prompt from metadata for the AI model.
 */
function buildSummaryPrompt(
  filename: string,
  metadata: Record<string, unknown>,
): string {
  const lines: string[] = [
    `Archivo analizado: ${filename}`,
    "",
    "Metadatos extraidos:",
  ];

  // Document properties
  const props = ["title", "author", "subject", "creator", "producer", "application", "appVersion", "operatingSystem", "creationDate", "modificationDate"];
  for (const key of props) {
    if (metadata[key]) {
      lines.push(`  ${key}: ${metadata[key]}`);
    }
  }

  // Lists
  const lists: [string, string][] = [
    ["users", "Usuarios encontrados"],
    ["emails", "Emails encontrados"],
    ["paths", "Rutas de archivo"],
    ["servers", "Servidores"],
    ["printers", "Impresoras"],
  ];

  for (const [key, label] of lists) {
    const arr = metadata[key] as string[] | undefined;
    if (arr && arr.length > 0) {
      lines.push(`\n${label}:`);
      for (const item of arr) {
        lines.push(`  - ${item}`);
      }
    }
  }

  // Warnings
  const warnings = metadata.warnings as string[] | undefined;
  if (warnings && warnings.length > 0) {
    lines.push("\nAdvertencias:");
    for (const w of warnings) {
      lines.push(`  - ${w}`);
    }
  }

  lines.push(
    "",
    "Por favor, genera un resumen de seguridad con:",
    "1. Resumen general del documento",
    "2. Informacion sensible encontrada (usuarios, emails, rutas internas, servidores)",
    "3. Riesgos potenciales de fuga de informacion",
    "4. Recomendaciones para limpiar el documento",
  );

  return lines.join("\n");
}
