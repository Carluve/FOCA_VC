// =============================================================================
// Footer - "Powered by Cloudflare Workers" - hacker terminal style
// =============================================================================

export function Footer() {
  return (
    <footer className="border-t border-foca-900/30 bg-[#0a0a0a] py-3 mt-auto">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-2 text-xs font-mono">
        <span className="text-foca-900">powered_by</span>
        <span className="text-foca-700">::</span>
        <svg
          className="h-3.5 w-3.5 text-foca-600"
          viewBox="0 0 128 128"
          fill="currentColor"
        >
          <path d="M99.3 79.4l3.2-10.8c.5-1.6.3-3.1-.5-4.2-.7-1-1.9-1.6-3.3-1.6H67.9c-.3 0-.6-.1-.8-.4-.2-.2-.3-.5-.2-.8.1-.4.4-.7.8-.7h31.7c3.4 0 6.8-2.7 7.9-6.2l3-7.8c.1-.2.1-.5.1-.7C109 21.3 88.6 2.5 63.8.1 59.2-.3 54.7-.2 50.3.6 27.6 3.6 10.6 16.5 3.1 34.1c-3.7 8.6-4.7 18-3 27.1.6 3.1 1.5 6.1 2.7 8.9.4.9 1.2 1.5 2.1 1.5h52.2c.1 0 .2 0 .3.1.6 0 1.6.5 1.3 2.1l-1.6 5.6c-.5 1.6-.3 3.1.5 4.2.7 1 1.9 1.6 3.3 1.6h30.8c.3 0 .6.1.8.4.2.2.3.5.2.8-.1.4-.4.7-.8.7H60.4c-3.4 0-6.8 2.7-7.9 6.2l-3 7.8c-.1.2-.1.5-.1.7 1 24.9 21.5 43.6 46.3 46 4.5.4 9.1.3 13.5-.5 22.7-3 39.7-15.9 47.2-33.5 3.7-8.6 4.7-18 3-27.1-.6-3.1-1.5-6.1-2.7-8.9-.4-.9-1.2-1.5-2.1-1.5H102.4c-.1 0-.2 0-.3-.1-.6 0-1.6-.5-1.3-2.1l1.6-5.6z"/>
        </svg>
        <span className="text-foca-500 font-medium">Cloudflare Workers</span>
      </div>
    </footer>
  );
}
