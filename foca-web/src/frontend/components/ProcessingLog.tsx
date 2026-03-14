// =============================================================================
// Processing log - hacker terminal style
// =============================================================================

import type { LogEntry } from "../lib/api";

interface Props {
  logs: LogEntry[];
}

export function ProcessingLog({ logs }: Props) {
  return (
    <div className="bg-[#0d0d0d] border border-foca-900/30 rounded-lg p-5 font-mono">
      <h3 className="text-xs font-semibold text-foca-600 mb-4 uppercase tracking-wider">
        Processing Log
      </h3>
      <div className="space-y-0">
        {logs.map((log, i) => (
          <div key={i} className="flex items-start gap-3 group">
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center pt-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  log.level === "error"
                    ? "bg-red-500"
                    : log.level === "warn"
                      ? "bg-yellow-500"
                      : "bg-foca-500"
                }`}
              />
              {i < logs.length - 1 && (
                <div className="w-px h-full min-h-[20px] bg-foca-900/30 mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="pb-3 min-w-0">
              <p
                className={`text-xs ${
                  log.level === "error"
                    ? "text-red-400"
                    : log.level === "warn"
                      ? "text-yellow-400"
                      : "text-foca-500"
                }`}
              >
                [{log.level.toUpperCase()}] {log.message}
              </p>
              <time className="text-xs text-foca-900">{formatTime(log.timestamp)}</time>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso + "Z");
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}
