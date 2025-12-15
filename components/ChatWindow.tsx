import React, { useRef, useEffect } from 'react';
import { Sender } from '../types';
import { useChatHistory } from '../hooks/useChatHistory';
import Message from './Message';
import UserInput from './UserInput';

const ChatWindow: React.FC = () => {
  // The useChatHistory hook no longer provides pagination logic.
  const { messages, isLoading, sendMessage } = useChatHistory();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Simplified scroll-to-bottom logic for new messages.
  useEffect(() => {
    // Always scroll to the bottom when a new message is added or AI starts typing.
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // All IntersectionObserver and pagination logic has been removed.

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col bg-[var(--color-bg-secondary)] rounded-md shadow-xl border-2 border-[var(--color-border)] overflow-hidden">
      <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto">
        {/* The top sentinel and loading indicator for pagination have been removed. */}
        <div className="space-y-8">
          {messages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <Message message={{ id: 'loading', text: '', sender: Sender.AI }} isLoading={true} />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 bg-[var(--color-bg-secondary)] border-t-2 border-[var(--color-border)]">
        <UserInput onSendMessage={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default ChatWindow;