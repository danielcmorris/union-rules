export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  question: string;
  context?: string;
  conversationHistory?: { role: string; content: string }[];
}

export interface ChatResponse {
  answer: string;
}

export interface VertexAiRequest {
  question: string;
  timesheetContext?: string;
}

export interface VertexAiResponse {
  answer: string;
}
