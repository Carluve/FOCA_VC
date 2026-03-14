import React from "react";
import type { HistoryJob } from "../lib/api";

interface Props {
  jobs: HistoryJob[];
  loading: boolean;
  onViewResult: (id: string) => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  uploaded: { bg: "bg-blue-100", text: "text-blue-700", label: "Uploaded" },
  analyzing: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Analyzing" },
  completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
  error: { bg: "bg-red-100", text: "text-red-700", label: "Error" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.error;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryTable({ jobs, loading, onViewResult }: Props) {
  if (loading) {
    return (
      <div className="card p-8 text-center text-gray-500">
        <div className="animate-pulse">Loading history...</div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m0 0l2.25 2.25M9.75 15l2.25-2.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500 text-sm">No files analyzed yet</p>
        <p className="text-gray-400 text-xs mt-1">Upload a document to get started</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Size</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Date</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900 truncate max-w-[200px]" title={job.filename}>
                  {job.filename}
                </div>
                <div className="text-xs text-gray-400 font-mono">{job.id.slice(0, 8)}...</div>
              </td>
              <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                {formatBytes(job.file_size)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={job.status} />
              </td>
              <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                {formatDate(job.created_at)}
              </td>
              <td className="px-4 py-3 text-right">
                {job.status === "completed" ? (
                  <button
                    onClick={() => onViewResult(job.id)}
                    className="text-foca-600 hover:text-foca-800 text-sm font-medium"
                  >
                    View Results
                  </button>
                ) : job.status === "error" ? (
                  <button
                    onClick={() => onViewResult(job.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    View Error
                  </button>
                ) : (
                  <span className="text-gray-400 text-sm">Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
