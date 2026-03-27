import type { AIProviderType } from '@/config/ai';

export interface AIModelConfig {
  id: string;
  name: string;
  provider: AIProviderType;
  maxTokens?: number;
  supportsStreaming?: boolean;
  description?: string;
}

export interface AIStreamPart {
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'done';
  text?: string;
  toolCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  toolResult?: {
    name: string;
    result: unknown;
  };
  error?: string;
}

export interface AICompletionOptions {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: AItoolDefinition[];
  toolChoice?: string;
}

export interface AItoolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AICompletionResult {
  text: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  finishReason: 'stop' | 'length' | 'tool-calls' | 'error';
}

export interface AIProvider {
  type: AIProviderType;
  isAvailable: boolean;
  
  complete(options: AICompletionOptions): Promise<AICompletionResult>;
  
  stream(options: AICompletionOptions): AsyncGenerator<AIStreamPart>;
  
  getAvailableModels(): AIModelConfig[];
  
  getDefaultModel(): AIModelConfig;
  
  healthCheck(): Promise<boolean>;
}
