import { useState, useCallback } from 'react';
import { Message as MessageType, Sender, AIChatResponse } from '../types';
import { sendMessageToGemini } from '../services/geminiService';

// The default welcome message, now separate from any history.
const welcomeMessage: MessageType = {
  id: 'initial',
  text: 'Olá! Eu sou a Jack Brito GPT. Como posso te ajudar hoje?',
  sender: Sender.AI,
};

export const useChatHistory = () => {
  // Start with only the welcome message. History is no longer loaded.
  const [messages, setMessages] = useState<MessageType[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (inputText: string) => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: MessageType = {
      id: Date.now().toString(),
      text: inputText,
      sender: Sender.USER,
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      const aiResponse: AIChatResponse = await sendMessageToGemini(inputText);
      let aiMessage: MessageType;

      if (aiResponse.errorMessage) {
        aiMessage = {
          id: (Date.now() + 1).toString(),
          text: aiResponse.errorMessage,
          sender: Sender.AI,
        };
      } else if (aiResponse.imageUrl) {
        aiMessage = {
          id: (Date.now() + 1).toString(),
          imageUrl: aiResponse.imageUrl,
          text: aiResponse.text || (inputText.startsWith('/imagem') 
            ? `Aqui está a imagem que criei para você com o prompt: "${inputText.substring('/imagem '.length).trim()}"` 
            : `Aqui está a imagem que editei para você!`),
          sender: Sender.AI,
        };
      } else { // Default to text response
        aiMessage = {
          id: (Date.now() + 1).toString(),
          text: aiResponse.text || "Não recebi uma resposta válida.",
          sender: Sender.AI,
          sources: aiResponse.sources,
        };
      }
      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error) {
      const errorMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        text: "Desculpe, ocorreu um erro inesperado ao processar sua solicitação. Tente novamente.",
        sender: Sender.AI,
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Pagination and mock history logic has been removed.
  return {
    messages,
    isLoading,
    sendMessage,
  };
};