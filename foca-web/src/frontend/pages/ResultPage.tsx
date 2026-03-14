// =============================================================================
// Result Page - hacker terminal aesthetic
// =============================================================================

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { MetadataView } from "../components/MetadataView";
import { ProcessingLog } from "../components/ProcessingLog";
import {
  fetchResult,
  cleanDownloadUrl,
  summarizeAnalysis,
  type AnalysisResult,
} from "../lib/api";

interface Props {
  onLogout: () => void;
}

export function ResultPage({ onLogout }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI summary state
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchResult(id)
      .then((data) => {
        setResult(data);
        // Load persisted AI summary if it exists
        if (data.ai_summary) {
          setSummary(data.ai_summary);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSummarize() {
    if (!id) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const text = await summarizeAnalysis(id);
      setSummary(text);
    } catch (err) {
      setSummaryError(
        err instanceof Error ? err.message : "Failed to generate summary",
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col scanlines">
      <Header onLogout={onLogout} />

      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full font-mono">
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="text-foca-600 hover:text-foca-400 text-xs mb-6 inline-flex items-center gap-1 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          cd ../dashboard
        </button>

        {loading && (
          <div className="text-foca-700 text-center py-20 text-sm">
            Loading analysis data...
          </div>
        )}

        {error && (
          <div className="text-red-400 bg-red-950/20 border border-red-900/40 rounded-lg px-6 py-4 text-sm">
            [ERR] {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* File info header */}
            <div className="bg-[#0d0d0d] border border-foca-900/30 rounded-lg p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-lg font-bold text-foca-300 text-glow">
                    {result.filename}
                  </h1>
                  <div className="flex items-center gap-3 mt-2 text-xs text-foca-700">
                    <span>{result.filetype}</span>
                    <span className="text-foca-900">|</span>
                    <span>{formatBytes(result.filesize)}</span>
                    <span className="text-foca-900">|</span>
                    <StatusBadge status={result.status} />
                  </div>
                  <p className="text-foca-900 text-xs mt-2">
                    id: <code className="text-foca-700">{result.id}</code>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* AI Summary button - only show if no summary exists yet */}
                  {result.status === "completed" && result.metadata && !summary && (
                    <button
                      onClick={handleSummarize}
                      disabled={summaryLoading}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-purple-950/30
                                 border border-purple-800/40 hover:border-purple-600/50
                                 disabled:bg-[#111] disabled:border-foca-900/20 disabled:text-foca-900
                                 text-purple-400 text-xs font-mono rounded transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      {summaryLoading ? "generating..." : "ai_summary"}
                    </button>
                  )}

                  {/* Download clean file */}
                  {result.status === "completed" && (
                    <a
                      href={cleanDownloadUrl(result.id)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-foca-950/30
                                 border border-foca-800/40 hover:border-foca-500/50
                                 text-foca-400 text-xs font-mono rounded transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      download_clean
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* AI Summary section */}
            {(summary || summaryError) && (
              <div
                className={`border rounded-lg p-6 ${
                  summaryError
                    ? "bg-red-950/10 border-red-900/40"
                    : "bg-purple-950/10 border-purple-900/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <svg
                    className={`w-4 h-4 ${summaryError ? "text-red-500" : "text-purple-400"}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h2 className={`text-sm font-semibold ${summaryError ? "text-red-400" : "text-purple-400"}`}>
                    AI Security Analysis
                  </h2>
                  <span className="text-xs text-foca-900 ml-auto">
                    Workers AI // AI Gateway (foca-v1)
                  </span>
                </div>
                {summaryError ? (
                  <p className="text-red-400 text-xs">[ERR] {summaryError}</p>
                ) : (
                  <div className="text-foca-400 text-sm whitespace-pre-wrap leading-relaxed">
                    {summary}
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            {result.metadata && <MetadataView metadata={result.metadata} />}

            {/* Processing Log */}
            {result.logs.length > 0 && <ProcessingLog logs={result.logs} />}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    uploaded: "text-blue-400 border-blue-800/50 bg-blue-950/20",
    analyzing: "text-yellow-400 border-yellow-800/50 bg-yellow-950/20",
    completed: "text-foca-400 border-foca-800/50 bg-foca-950/20",
    error: "text-red-400 border-red-800/50 bg-red-950/20",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono border ${colors[status] ?? "text-foca-700 border-foca-900/30"}`}>
      {status}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
