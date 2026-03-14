// =============================================================================
// Dashboard Page - hacker terminal aesthetic
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FileDropZone } from "../components/FileDropZone";
import { HistoryTable } from "../components/HistoryTable";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { analyzeFile, fetchHistory, type AnalysisSummary } from "../lib/api";

interface Props {
  onLogout: () => void;
}

export function DashboardPage({ onLogout }: Props) {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AnalysisSummary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const refreshHistory = useCallback(async () => {
    try {
      const data = await fetchHistory();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  async function handleFileDrop(file: File) {
    setUploading(true);
    setUploadError(null);

    try {
      const result = await analyzeFile(file);
      await refreshHistory();
      navigate(`/result/${result.id}`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col scanlines">
      <Header onLogout={onLogout} />

      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {/* Upload section */}
        <section className="mb-10">
          <h2 className="text-sm font-mono text-foca-500 mb-4 flex items-center gap-2">
            <span className="text-foca-800">$</span>
            analyze --upload
          </h2>
          <FileDropZone
            onFileDrop={handleFileDrop}
            uploading={uploading}
          />
          {uploadError && (
            <div className="mt-3 text-red-400 text-sm font-mono bg-red-950/20 border border-red-900/40 rounded px-4 py-3">
              [ERR] {uploadError}
            </div>
          )}
        </section>

        {/* History section */}
        <section>
          <h2 className="text-sm font-mono text-foca-500 mb-4 flex items-center gap-2">
            <span className="text-foca-800">$</span>
            history --list
          </h2>
          {loadingHistory ? (
            <div className="text-foca-800 text-center py-12 font-mono text-sm">
              Loading records...
            </div>
          ) : history.length === 0 ? (
            <div className="text-foca-800 text-center py-12 border border-foca-900/30 rounded-lg bg-[#0d0d0d] font-mono text-sm">
              No analyses found. Upload a document to begin.
            </div>
          ) : (
            <HistoryTable analyses={history} />
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
