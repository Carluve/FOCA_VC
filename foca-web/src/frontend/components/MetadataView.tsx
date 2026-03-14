// =============================================================================
// Metadata visualization - hacker terminal style
// =============================================================================

import { useState } from "react";

interface Props {
  metadata: Record<string, unknown>;
}

export function MetadataView({ metadata }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  const users = (metadata.users as string[]) ?? [];
  const emails = (metadata.emails as string[]) ?? [];
  const paths = (metadata.paths as string[]) ?? [];
  const servers = (metadata.servers as string[]) ?? [];
  const printers = (metadata.printers as string[]) ?? [];
  const warnings = (metadata.warnings as string[]) ?? [];
  const raw = (metadata.raw as Record<string, string>) ?? {};

  return (
    <div className="space-y-4 font-mono">
      <h2 className="text-sm text-foca-500 flex items-center gap-2">
        <span className="text-foca-800">$</span>
        metadata --extract
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="USERS" count={users.length} />
        <StatCard label="EMAILS" count={emails.length} />
        <StatCard label="PATHS" count={paths.length} />
        <StatCard label="SERVERS" count={servers.length} />
      </div>

      {/* Document properties */}
      <div className="bg-[#0d0d0d] border border-foca-900/30 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-foca-600 mb-3 uppercase tracking-wider">
          Document Properties
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <PropRow label="title" value={metadata.title as string} />
          <PropRow label="author" value={metadata.author as string} />
          <PropRow label="subject" value={metadata.subject as string} />
          <PropRow label="creator" value={metadata.creator as string} />
          <PropRow label="producer" value={metadata.producer as string} />
          <PropRow label="app" value={metadata.application as string} />
          <PropRow label="version" value={metadata.appVersion as string} />
          <PropRow label="os" value={metadata.operatingSystem as string} />
          <PropRow label="created" value={metadata.creationDate as string} />
          <PropRow label="modified" value={metadata.modificationDate as string} />
        </div>
      </div>

      {/* Lists */}
      {users.length > 0 && <ListCard title="Users Found" items={users} />}
      {emails.length > 0 && <ListCard title="Emails Found" items={emails} />}
      {paths.length > 0 && <ListCard title="File Paths" items={paths} />}
      {servers.length > 0 && <ListCard title="Servers" items={servers} />}
      {printers.length > 0 && <ListCard title="Printers" items={printers} />}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-950/10 border border-yellow-800/30 rounded-lg p-5">
          <h3 className="text-xs font-semibold text-yellow-500 mb-2 uppercase tracking-wider">Warnings</h3>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-yellow-400/70 text-sm">[WARN] {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Raw JSON toggle */}
      <div className="bg-[#0d0d0d] border border-foca-900/30 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="w-full px-5 py-3 flex items-center justify-between text-sm text-foca-700
                     hover:text-foca-400 transition-colors"
        >
          <span className="text-xs uppercase tracking-wider">
            Raw Metadata ({Object.keys(raw).length} properties)
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${showRaw ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showRaw && (
          <pre className="px-5 pb-4 text-xs text-foca-600 overflow-x-auto max-h-96">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg border border-foca-900/30 bg-[#0d0d0d] p-4">
      <div className={`text-2xl font-bold ${count > 0 ? "text-foca-400 text-glow" : "text-foca-800"}`}>
        {count}
      </div>
      <div className="text-xs text-foca-700 mt-0.5 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function PropRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-foca-800 w-20 flex-shrink-0">{label}:</span>
      <span className="text-foca-300 break-all">{value}</span>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-[#0d0d0d] border border-foca-900/30 rounded-lg p-5">
      <h3 className="text-xs font-semibold text-foca-600 mb-3 uppercase tracking-wider">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-foca-400 flex items-start gap-2">
            <span className="text-foca-800 mt-0.5">{">"}</span>
            <code className="text-foca-300 break-all bg-foca-950/30 px-1.5 py-0.5 rounded text-xs">
              {item}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}
