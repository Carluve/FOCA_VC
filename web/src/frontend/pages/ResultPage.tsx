import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { getResult, downloadCleanFile, type ResultResponse } from "../lib/api";

interface Props {
  id: string;
  onBack: () => void;
  onLogout: () => void;
}

export function ResultPage({ id, onBack, onLogout }: Props) {
  const [data, setData] = useState<ResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"metadata" | "json" | "log">("metadata");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await getResult(id);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load result");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadCleanFile(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onLogout={onLogout} />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="animate-pulse text-foca-700">Loading result...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onLogout={onLogout} />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <p className="text-red-600 mb-4">{error || "Result not found"}</p>
          <button onClick={onBack} className="btn-secondary">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const meta = data.metadata;
  const tabs = [
    { id: "metadata" as const, label: "Metadata" },
    { id: "json" as const, label: "Raw JSON" },
    { id: "log" as const, label: "Processing Log" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLogout={onLogout} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back + File Info */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <button onClick={onBack} className="text-sm text-foca-600 hover:text-foca-800 mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back to Dashboard
            </button>
            <h2 className="text-xl font-bold text-gray-900">{data.job.filename}</h2>
            <p className="text-sm text-gray-500 font-mono">{id}</p>
          </div>
          <button onClick={handleDownload} className="btn-primary" disabled={downloading}>
            {downloading ? "Downloading..." : "Download Clean File"}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-foca-600 text-foca-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "metadata" && meta && <MetadataView metadata={meta} />}
        {activeTab === "json" && (
          <div className="card p-4">
            <pre className="text-xs font-mono text-gray-700 overflow-auto max-h-[600px] whitespace-pre-wrap">
              {JSON.stringify(meta, null, 2)}
            </pre>
          </div>
        )}
        {activeTab === "log" && <LogView log={data.log} />}
      </main>
    </div>
  );
}

// ── Metadata Structured View ────────────────────────────────────

function MetadataView({ metadata }: { metadata: Record<string, unknown> }) {
  const m = metadata as Record<string, unknown>;

  const sections: Array<{ title: string; items: Array<{ label: string; value: unknown }> }> = [];

  // General info
  const generalItems: Array<{ label: string; value: unknown }> = [];
  if (m.title) generalItems.push({ label: "Title", value: m.title });
  if (m.subject) generalItems.push({ label: "Subject", value: m.subject });
  if (m.description) generalItems.push({ label: "Description", value: m.description });
  if (m.keywords) generalItems.push({ label: "Keywords", value: m.keywords });
  if (m.category) generalItems.push({ label: "Category", value: m.category });
  if (m.company) generalItems.push({ label: "Company", value: m.company });
  if (m.language) generalItems.push({ label: "Language", value: m.language });
  if (m.template) generalItems.push({ label: "Template", value: m.template });
  if (m.operatingSystem) generalItems.push({ label: "Operating System", value: m.operatingSystem });
  if (m.statistic) generalItems.push({ label: "Statistics", value: m.statistic });
  if (m.comments) generalItems.push({ label: "Comments", value: m.comments });
  if (generalItems.length) sections.push({ title: "General", items: generalItems });

  // Dates
  const dates = m.dates as Record<string, string> | undefined;
  if (dates) {
    const dateItems: Array<{ label: string; value: unknown }> = [];
    if (dates.creationDate) dateItems.push({ label: "Created", value: formatDateISO(dates.creationDate) });
    if (dates.modificationDate) dateItems.push({ label: "Modified", value: formatDateISO(dates.modificationDate) });
    if (dates.printingDate) dateItems.push({ label: "Printed", value: formatDateISO(dates.printingDate) });
    if (dateItems.length) sections.push({ title: "Dates", items: dateItems });
  }

  // Users
  const users = m.users as Array<{ value: string; isComputerUser: boolean; notes?: string }> | undefined;
  if (users?.length) {
    sections.push({
      title: "Users",
      items: users.map((u) => ({
        label: u.isComputerUser ? "Computer User" : "Author",
        value: u.value + (u.notes ? ` (${u.notes})` : ""),
      })),
    });
  }

  // Applications
  const apps = m.applications as Array<{ value: string; source?: string }> | undefined;
  if (apps?.length) {
    sections.push({
      title: "Applications",
      items: apps.map((a) => ({
        label: a.source || "Application",
        value: a.value,
      })),
    });
  }

  // Emails
  const emails = m.emails as string[] | undefined;
  if (emails?.length) {
    sections.push({
      title: "Emails",
      items: emails.map((e) => ({ label: "Email", value: e })),
    });
  }

  // Paths
  const paths = m.paths as Array<{ value: string; isComputerFolder: boolean }> | undefined;
  if (paths?.length) {
    sections.push({
      title: "Paths & URLs",
      items: paths.map((p) => ({
        label: p.isComputerFolder ? "File Path" : "URL",
        value: p.value,
      })),
    });
  }

  // Printers
  const printers = m.printers as string[] | undefined;
  if (printers?.length) {
    sections.push({
      title: "Printers",
      items: printers.map((p) => ({ label: "Printer", value: p })),
    });
  }

  // GPS
  const gps = m.gps as { latitude: number; longitude: number; altitude?: string } | undefined;
  if (gps) {
    sections.push({
      title: "GPS Location",
      items: [
        { label: "Latitude", value: gps.latitude.toFixed(6) },
        { label: "Longitude", value: gps.longitude.toFixed(6) },
        ...(gps.altitude ? [{ label: "Altitude", value: gps.altitude }] : []),
      ],
    });
  }

  // Servers
  const servers = m.servers as string[] | undefined;
  if (servers?.length) {
    sections.push({
      title: "Servers / Devices",
      items: servers.map((s) => ({ label: "Device", value: s })),
    });
  }

  // History
  const history = m.history as Array<{ value: string; comments?: string }> | undefined;
  if (history?.length) {
    sections.push({
      title: "History",
      items: history.map((h) => ({
        label: "Entry",
        value: h.value + (h.comments ? ` -- ${h.comments}` : ""),
      })),
    });
  }

  if (sections.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-500">
        No metadata was extracted from this file.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {sections.map((section) => (
        <div key={section.title} className="card p-5">
          <h3 className="text-sm font-semibold text-foca-700 uppercase tracking-wide mb-3">
            {section.title}
          </h3>
          <dl className="space-y-2">
            {section.items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <dt className="text-xs font-medium text-gray-500 min-w-[100px] shrink-0">
                  {item.label}
                </dt>
                <dd className="text-sm text-gray-900 break-all">{String(item.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

// ── Log View ────────────────────────────────────────────────────

function LogView({ log }: { log: Array<{ timestamp: string; message: string; level: string }> }) {
  if (!log?.length) {
    return (
      <div className="card p-8 text-center text-gray-500">No processing log available.</div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-gray-100">
        {log.map((entry, i) => (
          <div key={i} className="px-4 py-2 flex items-start gap-3 text-sm">
            <span className="text-xs text-gray-400 font-mono shrink-0 pt-0.5">
              {formatTime(entry.timestamp)}
            </span>
            <span
              className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                entry.level === "error"
                  ? "bg-red-100 text-red-700"
                  : entry.level === "warn"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {entry.level.toUpperCase()}
            </span>
            <span className="text-gray-700">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDateISO(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
