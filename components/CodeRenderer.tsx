import React, { useState, useMemo, useRef, useEffect } from 'react';
import JSONPretty from 'react-json-pretty';
import JSONPrettyMon from 'react-json-pretty/dist/monikai.js'; // Monokai theme is good for dark cyberpunk style

interface CodeRendererProps {
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  jsonCode: string;
}

const FullscreenEnterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1v4m0 0h-4m4 0l-5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5v4m0 0h-4" />
    </svg>
);

const FullscreenExitIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l-5 5m0 0v-4m0 4h4m1-11l5-5m0 0h-4m4 0v4M10 10l5-5" />
    </svg>
);


const CodeRenderer: React.FC<CodeRendererProps> = ({ htmlCode, cssCode, jsCode, jsonCode }) => {
  const [jsonView, setJsonView] = useState<'tree' | 'raw'>('tree');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rendererRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!rendererRef.current) return;
    if (!document.fullscreenElement) {
      rendererRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const parsedJson = useMemo(() => {
    if (!jsonCode) return null;
    try {
      return { data: JSON.parse(jsonCode) };
    } catch (e) {
      return { error: 'JSON inválido.' };
    }
  }, [jsonCode]);

  if (jsonCode) {
    if (parsedJson?.error) {
      return (
        <div className="bg-[var(--color-bg-primary)] rounded-md border border-red-500/50 max-h-96 overflow-auto">
          <div className="p-4 text-sm text-red-400">
            <p className="font-semibold mb-2">Could not parse JSON</p>
            <code>{parsedJson.error}</code>
          </div>
        </div>
      );
    }
    
    if (parsedJson?.data) {
      return (
        <div ref={rendererRef} className={`bg-[var(--color-bg-primary)] rounded-md border border-[var(--color-border)] flex flex-col ${isFullscreen ? 'h-full' : 'max-h-96'}`}>
          <div className="flex items-center p-1 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] flex-shrink-0">
            <button
              onClick={() => setJsonView('tree')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                jsonView === 'tree' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-hover)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Tree View
            </button>
            <button
              onClick={() => setJsonView('raw')}
              className={`ml-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                jsonView === 'raw' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-hover)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Raw Text
            </button>
            <button 
              onClick={toggleFullscreen}
              className="ml-auto p-1.5 text-[var(--color-text-secondary)] rounded-md hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-colors"
              title={isFullscreen ? "Sair da Tela Inteira" : "Tela Inteira"}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
            </button>
          </div>
          <div className="overflow-auto p-4 text-sm flex-grow">
            {jsonView === 'tree' ? (
              // Fix: Removed specific style props like valueStyle, keyStyle, etc.,
              // which were causing a TypeScript error due to type definition mismatch.
              // Using JSONPrettyMon theme instead for consistent styling.
              <JSONPretty
                data={parsedJson.data}
                theme={JSONPrettyMon}
                style={{ fontSize: '0.875rem', backgroundColor: 'transparent', color: 'var(--color-text-primary)' }}
                mainStyle="line-height:1.3;background:transparent;overflow:auto;"
              />
            ) : (
              <pre className="text-[var(--color-text-primary)]">
                <code>{JSON.stringify(parsedJson.data, null, 2)}</code>
              </pre>
            )}
          </div>
        </div>
      );
    }
    return null;
  }

  const isJsOnly = !htmlCode && !jsonCode && jsCode;

  const srcDoc = `
    <html>
      <head>
        <style>
          body { 
            font-family: ${isJsOnly ? 'var(--font-code)' : 'var(--font-secondary)'}; /* Use theme secondary font for general text */
            color: var(--color-text-primary); /* Use theme variable */
            background-color: var(--color-bg-primary); /* Use theme variable */
            ${isJsOnly ? 'padding: 8px; box-sizing: border-box;' : ''}
            margin: 0;
          }
          .log {
            padding: 4px 0;
            border-bottom: 1px solid var(--color-bg-secondary); /* Use theme variable for subtle border */
            white-space: pre-wrap;
            word-break: break-all;
            font-size: 0.875rem;
          }
          .log.error { color: #FF6347; /* Tomato red */ }
          .log.warn { color: #FFD700; /* Gold yellow */ }
          .log.info { color: #87CEFA; /* Light sky blue */ }
          ${cssCode}
        </style>
      </head>
      <body>
        ${htmlCode}
        <script>
          ${isJsOnly ? `
            const originalConsole = {...window.console};
            const body = document.body;
            const createLog = (message, className) => {
              const el = document.createElement('div');
              el.className = 'log ' + className;
              el.textContent = Array.from(message).map(m => {
                if (m instanceof Error) { return m.stack || m.message; }
                try {
                  return JSON.stringify(m, null, 2);
                } catch (e) {
                  return String(m);
                }
              }).join(' ');
              body.appendChild(el);
            };
            window.console.log = (...args) => { createLog(args, 'log'); originalConsole.log(...args); };
            window.console.error = (...args) => { createLog(args, 'error'); originalConsole.error(...args); };
            window.console.warn = (...args) => { createLog(args, 'warn'); originalConsole.warn(...args); };
            window.console.info = (...args) => { createLog(args, 'info'); originalConsole.info(...args); };
            window.addEventListener('error', (event) => {
                createLog([event.message], 'error');
            });
          ` : ''}

          try {
            ${jsCode}
          } catch (e) {
            console.error(e);
          }
        <\/script>
      </body>
    </html>
  `;

  return (
    <div ref={rendererRef} className={`w-full bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] shadow-inner flex flex-col ${isFullscreen ? 'h-full' : 'h-96'}`}>
       <div className="flex items-center justify-between p-1 px-3 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] flex-shrink-0">
         <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Preview</span>
         <button 
           onClick={toggleFullscreen}
           className="p-1.5 text-[var(--color-text-secondary)] rounded-md hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-colors"
           title={isFullscreen ? "Sair da Tela Inteira" : "Tela Inteira"}
         >
           {isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
         </button>
       </div>
      <iframe
        srcDoc={srcDoc}
        title="Code Preview"
        sandbox="allow-scripts allow-modals allow-same-origin"
        frameBorder="0"
        width="100%"
        height="100%"
        className="flex-grow"
      />
    </div>
  );
};

export default CodeRenderer;