import React, { useState, useRef, useEffect } from 'react';
import { simulateFrameworkExecution } from '../services/geminiService';

interface FrameworkRendererProps {
  code: string;
  framework: 'flask' | 'django' | 'php';
}

const FrameworkRenderer: React.FC<FrameworkRendererProps> = ({ code, framework }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'logs'>('preview');
  const [currentPath, setCurrentPath] = useState('/');
  const [editableCode, setEditableCode] = useState(code);
  const [serverOutput, setServerOutput] = useState<string>('Server started...\nWaiting for requests...');
  const [renderedHtml, setRenderedHtml] = useState<string>('<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#666;">Waiting for response...</div>');
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rendererRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    handleRequest();
  }, []); // Run once on mount

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

  const handleRequest = async () => {
    setIsLoading(true);
    // If not on preview tab, switch to it to show loading/result
    if (activeTab !== 'preview') setActiveTab('preview');
    
    const result = await simulateFrameworkExecution(editableCode, framework, currentPath);
    
    setRenderedHtml(result.output);
    setServerOutput(prev => prev + '\n' + result.logs);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleRequest();
      }
  };

  const getFrameworkColor = () => {
    switch (framework) {
      case 'flask': return 'text-gray-400';
      case 'django': return 'text-green-700';
      case 'php': return 'text-indigo-500'; // PHP Blue/Purple
      default: return 'text-gray-500';
    }
  };

  const getPort = () => {
    switch (framework) {
      case 'flask': return '5000';
      case 'django': return '8000';
      case 'php': return '8080';
      default: return '80';
    }
  };

  const getFrameworkLabel = () => {
      switch (framework) {
        case 'flask': return 'Flask';
        case 'django': return 'Django';
        case 'php': return 'PHP';
        default: return 'Server';
      }
  };

  const getFooterInfo = () => {
    switch (framework) {
        case 'flask': return 'Werkzeug/2.0.3 Python/3.8.10';
        case 'django': return 'Django/4.0.3 Python/3.9.7';
        case 'php': return 'PHP 8.2.0 Development Server';
        default: return 'Unknown Server';
    }
  };

  return (
    <div ref={rendererRef} className={`w-full bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)] shadow-md flex flex-col overflow-hidden ${isFullscreen ? 'h-full' : 'h-[500px]'}`}>
      
      {/* Browser Chrome / Toolbar */}
      <div className="bg-[#f0f0f0] dark:bg-[#2d2d2d] border-b border-[var(--color-border)] p-2 flex items-center gap-2">
        <div className="flex gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        
        {/* Address Bar */}
        <div className="flex-grow flex items-center bg-white dark:bg-[#1a1a1a] rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1">
            <span className={`text-xs font-bold mr-1 ${getFrameworkColor()} select-none`}>
                {getFrameworkLabel()}://localhost:{getPort()}
            </span>
            <input 
                type="text" 
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-grow bg-transparent border-none outline-none text-sm text-[var(--color-text-primary)] font-[var(--font-code)]"
            />
        </div>
        
        <button 
            onClick={handleRequest}
            disabled={isLoading}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-[var(--color-text-primary)]"
            title="Refresh / Go"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        </button>

        <button 
           onClick={toggleFullscreen}
           className="p-1 text-[var(--color-text-secondary)] rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
           title="Toggle Fullscreen"
        >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {isFullscreen 
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l-5 5m0 0v-4m0 4h4m1-11l5-5m0 0h-4m4 0v4M10 10l5-5" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1v4m0 0h-4m4 0l-5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5v4m0 0h-4" />
                }
            </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#e5e5e5] dark:bg-[#252525] border-b border-[var(--color-border)] text-xs font-semibold">
          <button 
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 border-r border-[var(--color-border)] hover:bg-[var(--color-bg-primary)] ${activeTab === 'preview' ? 'bg-[var(--color-bg-primary)] text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'}`}
          >
              Browser Preview
          </button>
          <button 
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 border-r border-[var(--color-border)] hover:bg-[var(--color-bg-primary)] ${activeTab === 'code' ? 'bg-[var(--color-bg-primary)] text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'}`}
          >
              Server Code
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 hover:bg-[var(--color-bg-primary)] ${activeTab === 'logs' ? 'bg-[var(--color-bg-primary)] text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'}`}
          >
              Server Logs
          </button>
      </div>

      {/* Content Area */}
      <div className="flex-grow bg-white relative overflow-hidden">
        {activeTab === 'preview' && (
            <div className="absolute inset-0 w-full h-full">
                {isLoading && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
                        <div className="h-full bg-[var(--color-accent)] animate-progress"></div>
                    </div>
                )}
                <iframe 
                    title="Simulated Browser"
                    className="w-full h-full border-none"
                    srcDoc={renderedHtml}
                    sandbox="allow-scripts allow-popups"
                />
            </div>
        )}

        {activeTab === 'code' && (
             <textarea
                className="w-full h-full p-4 bg-[#1e1e1e] text-[#d4d4d4] font-[var(--font-code)] text-sm resize-none outline-none"
                value={editableCode}
                onChange={(e) => setEditableCode(e.target.value)}
                spellCheck="false"
             />
        )}

        {activeTab === 'logs' && (
            <div className="w-full h-full p-4 bg-black text-green-500 font-mono text-xs overflow-auto whitespace-pre-wrap">
                {serverOutput}
            </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="bg-[#f0f0f0] dark:bg-[#2d2d2d] border-t border-[var(--color-border)] px-3 py-1 text-[10px] text-[var(--color-text-secondary)] flex justify-between">
          <span>{getFooterInfo()}</span>
          <span>Simulated Environment</span>
      </div>
    </div>
  );
};

export default FrameworkRenderer;