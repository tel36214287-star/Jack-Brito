import React, { useState, useEffect, useRef, useId } from 'react';
import { simulateJuliaExecution } from '../services/geminiService';
import { AIChatResponse } from '../types';

interface JuliaRendererProps {
  juliaCode: string;
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

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const JuliaRenderer: React.FC<JuliaRendererProps> = ({ juliaCode }) => {
  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editableJuliaCode, setEditableJuliaCode] = useState(juliaCode);
  const [plotData, setPlotData] = useState<any>(null);
  const rendererRef = useRef<HTMLDivElement>(null);
  const plotId = useId().replace(/:/g, ''); // Generate unique ID and clean it for DOM usage

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    // Render Plotly chart when plotData updates
    if (plotData && (window as any).Plotly) {
        // Adjust layout for dark/light themes dynamically if needed, or stick to provided layout
        const layout = {
            ...plotData.layout,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: {
                color: getComputedStyle(document.body).getPropertyValue('--color-text-primary').trim()
            }
        };
        (window as any).Plotly.newPlot(`plotly-${plotId}`, plotData.data, layout, {responsive: true});
    }
  }, [plotData, plotId]);

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

  const runSimulation = async () => {
    setIsExecuting(true);
    setOutput('');
    setPlotData(null); // Reset plot
    try {
      const response: AIChatResponse = await simulateJuliaExecution(editableJuliaCode);
      if (response.errorMessage) {
        setOutput(`### Erro na Execução\n\n${response.errorMessage}`);
      } else {
        // Parse for Plotly JSON block
        const plotMatch = response.text?.match(/```json-plotly\n([\s\S]*?)\n```/);
        let displayText = response.text || 'A execução não produziu nenhuma saída.';

        if (plotMatch) {
            try {
                const json = JSON.parse(plotMatch[1]);
                setPlotData(json);
                // Remove the raw JSON block from the display text to keep it clean
                displayText = displayText.replace(plotMatch[0], '');
            } catch (e) {
                console.error("Failed to parse plot JSON", e);
                displayText += "\n\n[Erro ao renderizar o gráfico visualmente]";
            }
        }
        setOutput(displayText);
      }
    } catch (e: any) {
      setOutput(`### Erro na Execução\n\n${e.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div ref={rendererRef} className={`w-full bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)] shadow-inner flex flex-col ${isFullscreen ? 'h-full' : 'min-h-96'}`}>
      {/* Editor Header */}
      <div className="flex items-center justify-between p-1 px-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] flex-shrink-0">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Editor Julia</span>
        <div className="flex items-center gap-2">
            <button
              onClick={runSimulation}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-colors text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Compilar & Executar Código Julia"
            >
              {isExecuting ? (
                <div className="w-3.5 h-3.5 border-2 border-[var(--color-text-secondary)] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PlayIcon />
              )}
              <span>{isExecuting ? 'Executando...' : 'Compilar & Executar'}</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-[var(--color-text-secondary)] rounded-md hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-colors"
              title={isFullscreen ? "Sair da Tela Inteira" : "Tela Inteira"}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
            </button>
        </div>
      </div>
      
      {/* Code Editor Area */}
      <textarea
        className="flex-grow p-4 text-sm font-[var(--font-code)] text-[var(--color-text-primary)] bg-transparent resize-none outline-none border-b border-[var(--color-border)] min-h-[150px]"
        value={editableJuliaCode}
        onChange={(e) => setEditableJuliaCode(e.target.value)}
        spellCheck="false"
        disabled={isExecuting}
        aria-label="Editor de código Julia"
      ></textarea>

      {/* Output Header */}
      <div className="flex items-center p-1 px-3 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] flex-shrink-0">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Saída da Execução</span>
      </div>

      {/* Output Area */}
      <div className="overflow-auto p-4 text-sm flex-grow font-[var(--font-code)] text-[var(--color-text-primary)] flex flex-col gap-4">
        {(!output && !plotData && !isExecuting) && <p className="text-[var(--color-text-secondary)]">Clique em 'Compilar & Executar' para ver o resultado.</p>}
        {output && <pre className="whitespace-pre-wrap break-words">{output}</pre>}
        
        {/* Plotly Chart Area */}
        {plotData && (
            <div className="w-full border border-[var(--color-border)] rounded-md bg-[rgba(255,255,255,0.05)] p-2">
                <div id={`plotly-${plotId}`} className="w-full h-80"></div>
            </div>
        )}
      </div>
    </div>
  );
};

export default JuliaRenderer;