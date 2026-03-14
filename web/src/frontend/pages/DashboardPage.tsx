import React, { useState, useEffect, useCallback } from "react";
import { Header } from "../components/Header";
import { FileDropZone } from "../components/FileDropZone";
import { HistoryTable } from "../components/HistoryTable";
import { uploadFile, getHistory, type HistoryJob, type AnalyzeResponse } from "../lib/api";

interface Props {
  onViewResult: (id: string) => void;
  onLogout: () => void;
}

export function DashboardPage({ onViewResult, onLogout }: Props) {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const data = await getHistory();
      setJobs(data.jobs);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleFileDrop = async (file: File) => {
    setUploading(true);
    setUploadMessage(null);

    try {
      const result: AnalyzeResponse = await uploadFile(file);
      setUploadMessage({
        type: result.status === "error" ? "error" : "success",
        text: result.message,
      });
      // Refresh history
      await fetchHistory();
      // Auto-navigate to result if completed
      if (result.status === "completed") {
        setTimeout(() => onViewResult(result.id), 800);
      }
    } catch (err) {
      setUploadMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLogout={onLogout} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Upload Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h2>
          <FileDropZone onFileDrop={handleFileDrop} disabled={uploading} />

          {uploading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-foca-700">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading and analyzing...
            </div>
          )}

          {uploadMessage && (
            <div
              className={`mt-4 text-sm rounded-lg px-4 py-3 border ${
                uploadMessage.type === "success"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {uploadMessage.text}
            </div>
          )}
        </section>

        {/* History Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Analysis History
              {total > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-2">({total} total)</span>
              )}
            </h2>
            <button onClick={fetchHistory} className="btn-secondary text-xs" disabled={loadingHistory}>
              Refresh
            </button>
          </div>
          <HistoryTable jobs={jobs} loading={loadingHistory} onViewResult={onViewResult} />
        </section>
      </main>
    </div>
  );
}
