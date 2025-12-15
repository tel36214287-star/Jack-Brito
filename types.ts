export enum Sender {
  USER = 'user',
  AI = 'ai',
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface AIChatResponse {
  text?: string;
  imageUrl?: string;
  errorMessage?: string;
  sources?: GroundingSource[];
}

export interface Message {
  id: string;
  text?: string; // Made optional as image messages might not have text
  imageUrl?: string; // Optional for image content
  sender: Sender;
  sources?: GroundingSource[];
}