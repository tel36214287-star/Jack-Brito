import React, { useState, useEffect, useRef } from 'react';
import { simulateRNTCommand } from '../services/geminiService';

interface RNTRendererProps {
  initialBoot?: boolean;
}

const NodeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
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

// Keys for LocalStorage
const RNT_STORAGE_KEY_HISTORY = 'rnt_os_history';
const RNT_STORAGE_KEY_CONTEXT = 'rnt_os_context';

const RNTRenderer: React.FC<RNTRendererProps> = ({ initialBoot = true }) => {
  // Initialize state from LocalStorage if available
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RNT_STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load RNT history", e);
      return [];
    }
  });

  // Store context as array of message pairs to manage token usage better
  const [contextMessages, setContextMessages] = useState<{user: string, system: string}[]>(() => {
    try {
      const saved = localStorage.getItem(RNT_STORAGE_KEY_CONTEXT);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load RNT context", e);
      return [];
    }
  });
  
  const [currentInput, setCurrentInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // New state for sync indicator
  
  const rendererRef = useRef<HTMLDivElement>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persistence Effects: Save to LocalStorage whenever state changes
  useEffect(() => {
    setIsSaving(true);
    const t = setTimeout(() => {
        localStorage.setItem(RNT_STORAGE_KEY_HISTORY, JSON.stringify(history));
        setIsSaving(false);
    }, 300); // Artificial delay to show the saving light
    return () => clearTimeout(t);
  }, [history]);

  useEffect(() => {
    setIsSaving(true);
    const t = setTimeout(() => {
        localStorage.setItem(RNT_STORAGE_KEY_CONTEXT, JSON.stringify(contextMessages));
        setIsSaving(false);
    }, 300);
    return () => clearTimeout(t);
  }, [contextMessages]);

  // Boot Sequence Effect
  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    
    // Only run boot sequence if history is empty (fresh start)
    // If we loaded history from storage, we skip this to "restore session" seamlessly.
    if (initialBoot && history.length === 0) {
        const bootMessages = [
            "Initializing RNT Kernel v1.0.4...",
            "Loading Aesthetic Drivers... [OK]",
            "Connecting to Jack Brito Neural Network... [CONNECTED]",
            "Mounting RNT-Pkg Mirror Nodes... [4 NODES FOUND]",
            "Welcome to Referring Node Transmission OS.",
            "Type 'help' to begin."
        ];
        
        let delay = 0;
        bootMessages.forEach((msg, index) => {
            delay += 600;
            const t = setTimeout(() => {
                setHistory(prev => [...prev, msg]);
            }, delay);
            timeouts.push(t);
        });
    }
    return () => {
        timeouts.forEach(clearTimeout);
    };
  }, []); // Run once on mount (dependency array empty to rely on initial load state)

  useEffect(() => {
    // Ensure smooth scrolling to bottom on every history update
    setTimeout(() => {
        outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, [history, isProcessing]);

  useEffect(() => {
     if (!isProcessing) {
         inputRef.current?.focus();
     }
  }, [isProcessing, history]);

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

  const handleCommandSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentInput.trim()) return;

      const command = currentInput;
      setCurrentInput("");
      
      // Styling the user prompt in the display history
      setHistory(prev => [...prev, `user@rnt:~$ ${command}`]);
      
      // Special Commands
      if (command.toLowerCase() === "clear") {
          // Clear visual history only, keep context (files/folders)
          // To truly clear screen while keeping context, we just reset the history array.
          // Note: This will also clear the history in LocalStorage, but contextMessages remains.
          setHistory([]);
          return;
      }

      if (command.toLowerCase() === "sys-reset" || command.toLowerCase() === "rnt-reset") {
          // Factory Reset: Wipe everything
          localStorage.removeItem(RNT_STORAGE_KEY_HISTORY);
          localStorage.removeItem(RNT_STORAGE_KEY_CONTEXT);
          setHistory(prev => [...prev, "Initiating System Wipe...", "Formatting Virtual Drive...", "System Halted."]);
          setContextMessages([]);
          setTimeout(() => {
             setHistory([]); // Clear screen to force a "shutdown" look
             // On next reload, it will boot fresh
          }, 2000);
          return;
      }

      setIsProcessing(true);
      
      // Construct context string from the last 15 messages to keep the token count manageable
      // but the context coherent (increased slightly to hold more file system state).
      const recentContext = contextMessages.slice(-15).map(m => `User: ${m.user}\nRNT System: ${m.system}`).join('\n');
      
      const response = await simulateRNTCommand(recentContext, command);
      
      setHistory(prev => [...prev, response]);
      
      // Update context state
      setContextMessages(prev => [...prev, {user: command, system: response}]);
      setIsProcessing(false);
  };

  return (
    <div ref={rendererRef} className={`w-full rounded-xl overflow-hidden shadow-2xl flex flex-col font-mono text-sm transition-all duration-300 border border-amber-900/30 ${isFullscreen ? 'h-full' : 'h-[500px]'}`} 
         style={{ 
             background: 'linear-gradient(135deg, #130a06 0%, #2c1a12 100%)', // Even darker warm brown/black
             color: '#e0c0a0' // Warm off-white/beige
         }}>
      
      {/* RNT Header - Beautiful & Intuitive */}
      <div className="flex items-center justify-between p-3 bg-black/40 backdrop-blur-md border-b border-amber-500/20 flex-shrink-0">
        <div className="flex items-center gap-3">
            {/* Status Light */}
            <div className={`w-3 h-3 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-colors duration-200 ${isProcessing ? 'bg-green-500 animate-ping' : (isSaving ? 'bg-red-500 animate-pulse' : 'bg-amber-500')}`} title={isSaving ? "Saving to Disk..." : "System Ready"}></div>
            
            <span className="text-amber-500"><NodeIcon /></span>
            <span className="text-xs font-bold text-amber-100 tracking-[0.2em] uppercase font-[var(--font-primary)]">RNT // OS</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-amber-700 font-bold uppercase tracking-widest hidden sm:flex">
            <span>Pkg: Active</span>
            <span>Net: Secure</span>
            <span className={isSaving ? "text-red-400" : ""}>{isSaving ? "HDD: Write" : "HDD: Idle"}</span>
        </div>
        <div>
            <button
            onClick={toggleFullscreen}
            className="p-1 text-amber-600 hover:text-amber-300 transition-colors"
            title={isFullscreen ? "Minimize" : "Maximize"}
            >
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
            </button>
        </div>
      </div>

      {/* Terminal Content - Glassmorphism Feel */}
      <div className="flex-grow p-6 overflow-y-auto relative" onClick={() => inputRef.current?.focus()}>
         {/* Subtle background texture */}
         <div className="absolute inset-0 opacity-5 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #f59e0b 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
         </div>

         {/* Inject custom scrollbar style for this component only */}
         <style>{`
            .rnt-container ::-webkit-scrollbar { width: 6px; }
            .rnt-container ::-webkit-scrollbar-track { background: #1a0f0a; }
            .rnt-container ::-webkit-scrollbar-thumb { background: #4a2c20; border-radius: 3px; }
            .rnt-container ::-webkit-scrollbar-thumb:hover { background: #f59e0b; }
         `}</style>

         <div className="whitespace-pre-wrap leading-relaxed relative z-10 font-[var(--font-code)] rnt-container">
             {history.map((line, idx) => (
                 <div key={idx} className={`${line.startsWith('user@rnt') ? 'text-amber-300 mt-3 font-bold border-l-2 border-amber-500/30 pl-2' : 'text-amber-100/90 mb-0.5'}`}>
                     {line}
                 </div>
             ))}
             {isProcessing && (
                 <div className="mt-2 flex items-center gap-2 text-amber-500/70 animate-pulse">
                     <span>_</span>
                     <span className="text-xs uppercase tracking-widest">[Processing Node Request]</span>
                 </div>
             )}
             <div ref={outputEndRef} className="h-4" />
         </div>
      </div>

      {/* Input Area - Integrated & Warm */}
      <div className="p-3 bg-black/30 backdrop-blur-sm border-t border-amber-500/10 flex-shrink-0">
          <form onSubmit={handleCommandSubmit} className="flex gap-2 items-center">
              <span className="text-amber-500 font-bold">user@rnt:~$</span>
              <input 
                ref={inputRef}
                type="text" 
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                className="flex-grow bg-transparent text-amber-100 border-none focus:outline-none placeholder-amber-900/30 font-[var(--font-code)]"
                autoFocus
                disabled={isProcessing}
                autoComplete="off"
                placeholder="Enter command..."
              />
          </form>
      </div>
    </div>
  );
};

export default RNTRenderer;