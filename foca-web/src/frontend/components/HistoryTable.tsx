// =============================================================================
// History table - hacker terminal style
// =============================================================================

import { useNavigate } from "react-router-dom";
import type { AnalysisSummary } from "../lib/api";

interface Props {
  analyses: AnalysisSummary[];
}

export function HistoryTable({ analyses }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-[#0d0d0d] border border-foca-900/30 rounded-lg overflow-hidden font-mono">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foca-900/30">
            <th className="text-left px-4 py-3 text-foca-600 font-medium text-xs uppercase tracking-wider">File</th>
            <th className="text-left px-4 py-3 text-foca-600 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Type</th>
            <th className="text-left px-4 py-3 text-foca-600 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Size</th>
            <th className="text-left px-4 py-3 text-foca-600 font-medium text-xs uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-foca-600 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
          </tr>
        </thead>
        <tbody>
          {analyses.map((a) => (
            <tr
              key={a.id}
              onClick={() => navigate(`/result/${a.id}`)}
              className="border-b border-foca-900/20 last:border-0 hover:bg-foca-950/30
                         cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileIcon filetype={a.filetype} />
                  <span className="text-foca-300 truncate max-w-[200px]">
                    {a.filename}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-foca-700 hidden sm:table-cell">
                {shortType(a.filetype)}
              </td>
              <td className="px-4 py-3 text-foca-700 hidden md:table-cell">
                {formatBytes(a.filesize)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={a.status} />
              </td>
              <td className="px-4 py-3 text-foca-800 hidden lg:table-cell">
                {formatDate(a.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    uploaded: "text-blue-400 border-blue-800/50 bg-blue-950/20",
    analyzing: "text-yellow-400 border-yellow-800/50 bg-yellow-950/20",
    completed: "text-foca-400 border-foca-800/50 bg-foca-950/20",
    error: "text-red-400 border-red-800/50 bg-red-950/20",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-mono border
                   ${styles[status] ?? "text-foca-700 border-foca-900/30 bg-[#111]"}`}
    >
      {status}
    </span>
  );
}

function FileIcon({ filetype }: { filetype: string }) {
  const color = filetype.includes("pdf")
    ? "text-red-500"
    : filetype.includes("word") || filetype.includes("docx")
      ? "text-blue-500"
      : filetype.includes("sheet") || filetype.includes("xlsx")
        ? "text-foca-500"
        : filetype.includes("presentation") || filetype.includes("pptx")
          ? "text-orange-500"
          : "text-foca-700";

  return (
    <svg className={`w-4 h-4 ${color} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function shortType(mime: string): string {
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("word")) return "DOCX";
  if (mime.includes("sheet")) return "XLSX";
  if (mime.includes("presentation")) return "PPTX";
  return mime.split("/").pop() ?? mime;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + "Z");
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
