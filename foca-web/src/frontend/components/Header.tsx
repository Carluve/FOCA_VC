// =============================================================================
// App header - hacker terminal style
// =============================================================================

import { useNavigate } from "react-router-dom";

interface Props {
  onLogout: () => void;
}

export function Header({ onLogout }: Props) {
  const navigate = useNavigate();

  return (
    <header className="border-b border-foca-900/40 bg-[#0a0a0a]/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <img src="/logo_square.png" alt="FOCA" className="w-7 h-7 rounded drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]" />
          <span className="text-foca-400 font-mono font-semibold text-sm">FOCA</span>
          <span className="text-foca-800 text-xs font-mono">v1.0</span>
        </button>

        <div className="flex items-center gap-4">
          <span className="text-foca-900 text-xs font-mono hidden sm:inline">
            session::active
          </span>
          <button
            onClick={onLogout}
            className="text-foca-700 hover:text-foca-400 text-xs font-mono transition-colors"
          >
            [logout]
          </button>
        </div>
      </div>
    </header>
  );
}
