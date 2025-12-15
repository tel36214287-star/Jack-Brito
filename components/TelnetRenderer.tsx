import React, { useState, useEffect, useRef } from 'react';
import { simulateTelnetCommand } from '../services/geminiService';

interface TelnetRendererProps {
  initialHost?: string;
}

const TerminalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

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

const TelnetRenderer: React.FC<TelnetRendererProps> = ({ initialHost = "localhost" }) => {
  const [host, setHost] = useState(initialHost);
  const [isConnected, setIsConnected] = useState(false);
  const [history, setHistory] = useState<string[]>([]); // Visual history for the user
  const [sessionContext, setSessionContext] = useState<string>(""); // Context string for Gemini
  const [currentInput, setCurrentInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const rendererRef = useRef<HTMLDivElement>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll to bottom whenever history changes
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
     // Focus input when connected
     if (isConnected && !isProcessing) {
         inputRef.current?.focus();
     }
  }, [isConnected, isProcessing, history]);

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

  const handleConnect = async () => {
      setIsProcessing(true);
      setHistory(prev => [...prev, `Connecting to ${host}...`]);
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get initial banner from Gemini
      const banner = await simulateTelnetCommand(host, "", "CONNECT_INIT");
      
      setHistory(prev => [...prev, `Connected to ${host}.`, banner]);
      setSessionContext(banner);
      setIsConnected(true);
      setIsProcessing(false);
  };

  const handleDisconnect = () => {
      setHistory(prev => [...prev, `Connection closed by foreign host.`]);
      setIsConnected(false);
      setSessionContext("");
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentInput.trim() && currentInput !== "") return; // Allow empty enter for new lines

      const command = currentInput;
      setCurrentInput("");
      setHistory(prev => [...prev, `> ${command}`]);
      
      if (command.toLowerCase() === "exit" || command.toLowerCase() === "logout") {
          handleDisconnect();
          return;
      }

      setIsProcessing(true);
      
      // Keep session context reasonable size, maybe last 10 interactions?
      // For now, we append to a growing string, Gemini handles context window well.
      const newContext = sessionContext + `\nUser: ${command}\n`;
      
      const response = await simulateTelnetCommand(host, newContext, command);
      
      setHistory(prev => [...prev, response]);
      setSessionContext(newContext + `System: ${response}\n`);
      setIsProcessing(false);
  };

  return (
    <div ref={rendererRef} className={`w-full bg-black rounded-lg border border-[var(--color-border)] shadow-[0_0_15px_rgba(0,0,0,0.5)] flex flex-col font-mono overflow-hidden ${isFullscreen ? 'h-full' : 'h-96'}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-2 bg-[#1a1a1a] border-b border-[#333] flex-shrink-0">
        <div className="flex items-center gap-2">
            <span className="text-green-500"><TerminalIcon /></span>
            <span className="text-xs font-bold text-gray-300 tracking-wider">TELNET SESSION // {host}</span>
        </div>
        <button
          onClick={toggleFullscreen}
          className="p-1 text-gray-400 hover:text-white transition-colors"
          title={isFullscreen ? "Sair da Tela Inteira" : "Tela Inteira"}
        >
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-grow p-4 overflow-y-auto text-sm text-green-500 bg-black font-[var(--font-code)]" onClick={() => inputRef.current?.focus()}>
         <div className="whitespace-pre-wrap leading-tight">
             {history.map((line, idx) => (
                 <div key={idx}>{line}</div>
             ))}
             {isProcessing && <div className="animate-pulse">_</div>}
         </div>
         <div ref={outputEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-2 bg-[#111] border-t border-[#333] flex-shrink-0">
          {!isConnected ? (
              <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="flex-grow bg-[#222] text-green-500 border border-[#444] px-3 py-1 rounded focus:outline-none focus:border-green-600 font-[var(--font-code)]"
                    placeholder="Enter hostname..."
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  />
                  <button 
                    onClick={handleConnect}
                    disabled={isProcessing}
                    className="bg-green-700 text-black px-4 py-1 rounded font-bold hover:bg-green-600 disabled:opacity-50"
                  >
                      CONNECT
                  </button>
              </div>
          ) : (
              <form onSubmit={handleCommandSubmit} className="flex gap-2 items-center">
                  <span className="text-green-600 font-bold">{">"}</span>
                  <input 
                    ref={inputRef}
                    type="text" 
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    className="flex-grow bg-transparent text-green-400 border-none focus:outline-none font-[var(--font-code)]"
                    autoFocus
                    disabled={isProcessing}
                    autoComplete="off"
                  />
              </form>
          )}
      </div>
    </div>
  );
};

export default TelnetRenderer;