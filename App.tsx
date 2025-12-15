import React, { useState, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import ThemeSelector from './components/ThemeSelector';

const App: React.FC = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'cyberpunk';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.className = `theme-${theme}`;
  }, [theme]);

  // Conditional header shadow and title text shadow based on theme
  const headerShadowClass = theme === 'hq' 
    ? 'shadow-[0_0_0_3px_var(--color-border)]' 
    : 'shadow-[0_0_15px_var(--color-border)]';
  
  const titleShadowStyle = theme === 'hq' 
    ? { textShadow: '2px 2px 0 var(--color-border), 4px 4px 0 var(--color-accent)' } 
    : { textShadow: '0 0 8px var(--color-accent), 0 0 15px var(--color-accent)' };

  return (
    <div className="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] min-h-screen flex flex-col font-[var(--font-secondary)] transition-colors duration-300">
      <header className={`bg-transparent p-4 sticky top-0 z-10 border-b-2 border-[var(--color-border)] flex justify-between items-center ${headerShadowClass}`}>
        {/* Left Decorative Element */}
        <div className="flex-1 flex justify-start items-center">
            <div className="w-1/4 h-1 bg-[var(--color-accent)] transform skew-x-[-20deg]" style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0% 100%)' }}></div>
            <div className="w-px h-6 bg-[var(--color-border)] mx-2"></div>
            <div className="w-4 h-4 border-2 border-[var(--color-border)] transform rotate-45"></div>
        </div>
        {/* Main Title and Subtitle */}
        <div className="flex-1 text-center">
            <h1 className="text-xl md:text-2xl font-bold font-[var(--font-primary)] uppercase tracking-widest" style={{ color: 'var(--color-accent)', ...titleShadowStyle }}>
              Jack Brito GPT
            </h1>
            <p className="text-center text-xs text-[var(--color-text-secondary)] font-[var(--font-secondary)] tracking-widest mt-1">POWERED BY GEMINI</p>
        </div>
        {/* Right Decorative Element and Theme Selector */}
        <div className="flex-1 flex justify-end items-center gap-4">
            <div className="w-4 h-4 border-2 border-[var(--color-border)] transform rotate-45"></div>
            <div className="w-px h-6 bg-[var(--color-border)] mx-2"></div>
            <div className="w-1/4 h-1 bg-[var(--color-accent)] transform skew-x-[20deg]" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 0 100%)' }}></div>
            <ThemeSelector currentTheme={theme} onThemeChange={setTheme} />
        </div>
      </header>
      <main className="flex-grow flex p-4 sm:p-6 justify-center"> {/* Centered content */}
        <ChatWindow />
      </main>
    </div>
  );
};

export default App;