import React, { useState } from 'react';

interface UserInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const UserInput: React.FC<UserInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!text.trim()) {
      setError('A mensagem não pode estar vazia.');
      return;
    }

    setError(null); // Clear any previous error
    onSendMessage(text);
    setText('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (error && e.target.value.trim()) {
      setError(null); // Clear error once user starts typing valid text
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
      <div className="flex items-center space-x-3">
        <div className="flex-grow relative">
          <input
            type="text"
            value={text}
            onChange={handleChange}
            placeholder="[ INICIAR CONSULTA... ]"
            disabled={isLoading}
            className="w-full bg-transparent text-[var(--color-text-primary)] rounded-none py-4 pl-5 pr-12 border-b-2 border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)] placeholder-[var(--color-text-secondary)] transition duration-300 disabled:opacity-50 font-[var(--font-secondary)] tracking-wider text-base"
            autoComplete="off"
            aria-invalid={!!error}
            aria-describedby={error ? "input-error-message" : undefined}
          />
          <div className="absolute left-0 top-0 h-full w-2 border-l-2 border-t-2 border-b-2 border-[var(--color-border)]"></div>
          <div className="absolute right-0 top-0 h-full w-2 border-r-2 border-t-2 border-b-2 border-[var(--color-border)]"></div>
        </div>
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="bg-[var(--color-accent)] text-white p-3 hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-secondary)] disabled:bg-[var(--color-text-secondary)] disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center w-12 h-12 flex-shrink-0"
          aria-label="Send message"
          style={{ clipPath: 'polygon(25% 0%, 100% 0%, 100% 100%, 25% 100%, 0% 50%)' }}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p id="input-error-message" className="text-[var(--color-accent)] text-sm ml-5 mt-1 font-[var(--font-secondary)]">
          {error}
        </p>
      )}
    </form>
  );
};

export default UserInput;
