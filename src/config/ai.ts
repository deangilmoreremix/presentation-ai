import { env } from "@/env";

export type AIProviderType =
  | "openai"
  | "together"
  | "ollama"
  | "lmstudio"
  | "mock";

export interface AIModelConfig {
  id: string;
  name: string;
  provider: AIProviderType;
  maxTokens?: number;
  supportsStreaming?: boolean;
  description?: string;
}

export interface AIProviderConfig {
  type: AIProviderType;
  apiKey?: string;
  baseUrl?: string;
  isAvailable: boolean;
  models: AIModelConfig[];
}

export interface AIProvider {
  type: AIProviderType;
  isAvailable: boolean;
  getAvailableModels(): AIModelConfig[];
  getDefaultModel(): AIModelConfig;
}

export const DEFAULT_MODELS: Record<string, AIModelConfig> = {
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    maxTokens: 128000,
    supportsStreaming: true,
    description: "Fast and affordable GPT-4 model",
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    maxTokens: 128000,
    supportsStreaming: true,
    description: "Most capable GPT-4 model",
  },
  "llama-3.1-8b": {
    id: "meta-llama/Llama-3.1-8B-Instruct-Turbo",
    name: "Llama 3.1 8B",
    provider: "together",
    maxTokens: 128000,
    supportsStreaming: true,
    description: "Meta's open source model via Together AI",
  },
  "llama-3.1-70b": {
    id: "meta-llama/Llama-3.1-70B-Instruct-Turbo",
    name: "Llama 3.1 70B",
    provider: "together",
    maxTokens: 128000,
    supportsStreaming: true,
    description: "Larger Meta model via Together AI",
  },
  "mistral-7b": {
    id: "mistralai/Mistral-7B-Instruct-v0.3",
    name: "Mistral 7B",
    provider: "together",
    maxTokens: 32000,
    supportsStreaming: true,
    description: "Fast and efficient Mistral model",
  },
  "mixtral-8x7b": {
    id: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    name: "Mixtral 8x7B",
    provider: "together",
    maxTokens: 32000,
    supportsStreaming: true,
    description: "Mixture of experts model",
  },
  "ollama-llama3": {
    id: "llama3.1",
    name: "Llama 3.1 (Local)",
    provider: "ollama",
    maxTokens: 8192,
    supportsStreaming: true,
    description: "Local Llama 3.1 via Ollama",
  },
  "ollama-mistral": {
    id: "mistral",
    name: "Mistral (Local)",
    provider: "ollama",
    maxTokens: 8192,
    supportsStreaming: true,
    description: "Local Mistral via Ollama",
  },
  "ollama-codellama": {
    id: "codellama",
    name: "Code Llama (Local)",
    provider: "ollama",
    maxTokens: 8192,
    supportsStreaming: true,
    description: "Local Code Llama via Ollama",
  },
  lmstudio: {
    id: "local-model",
    name: "Local Model (LM Studio)",
    provider: "lmstudio",
    maxTokens: 8192,
    supportsStreaming: true,
    description: "Any model loaded in LM Studio",
  },
  mock: {
    id: "mock",
    name: "Mock (Development)",
    provider: "mock",
    maxTokens: 10000,
    supportsStreaming: true,
    description: "Mock responses for development without API keys",
  },
};

export function isProviderAvailable(type: AIProviderType): boolean {
  switch (type) {
    case "openai":
      return !!env.OPENAI_API_KEY;
    case "together":
      return !!env.TOGETHER_AI_API_KEY;
    case "ollama":
      return !!env.OLLAMA_BASE_URL;
    case "lmstudio":
      return !!env.LM_STUDIO_BASE_URL;
    case "mock":
      return true;
    default:
      return false;
  }
}

export function getAvailableProviders(): AIProviderConfig[] {
  const providers: AIProviderConfig[] = [];

  if (isProviderAvailable("openai")) {
    providers.push({
      type: "openai",
      apiKey: env.OPENAI_API_KEY,
      isAvailable: true,
      models: Object.values(DEFAULT_MODELS).filter(
        (m): m is AIModelConfig => m?.provider === "openai",
      ),
    });
  }

  if (isProviderAvailable("together")) {
    providers.push({
      type: "together",
      apiKey: env.TOGETHER_AI_API_KEY,
      isAvailable: true,
      models: Object.values(DEFAULT_MODELS).filter(
        (m): m is AIModelConfig => m?.provider === "together",
      ),
    });
  }

  if (isProviderAvailable("ollama")) {
    providers.push({
      type: "ollama",
      baseUrl: env.OLLAMA_BASE_URL,
      isAvailable: true,
      models: Object.values(DEFAULT_MODELS).filter(
        (m): m is AIModelConfig => m?.provider === "ollama",
      ),
    });
  }

  if (isProviderAvailable("lmstudio")) {
    providers.push({
      type: "lmstudio",
      baseUrl: env.LM_STUDIO_BASE_URL,
      isAvailable: true,
      models: Object.values(DEFAULT_MODELS).filter(
        (m): m is AIModelConfig => m?.provider === "lmstudio",
      ),
    });
  }

  // Always include mock as fallback
  providers.push({
    type: "mock",
    isAvailable: true,
    models: [DEFAULT_MODELS["mock"]].filter(Boolean) as AIModelConfig[],
  });

  return providers;
}

export function getDefaultModel(): AIModelConfig {
  // Priority order: OpenAI > Together > Ollama > LM Studio > Mock
  if (isProviderAvailable("openai") && DEFAULT_MODELS["gpt-4o-mini"]) {
    return DEFAULT_MODELS["gpt-4o-mini"];
  }
  if (isProviderAvailable("together") && DEFAULT_MODELS["llama-3.1-8b"]) {
    return DEFAULT_MODELS["llama-3.1-8b"];
  }
  if (isProviderAvailable("ollama") && DEFAULT_MODELS["ollama-llama3"]) {
    return DEFAULT_MODELS["ollama-llama3"];
  }
  if (isProviderAvailable("lmstudio") && DEFAULT_MODELS["lmstudio"]) {
    return DEFAULT_MODELS["lmstudio"];
  }
  return (
    DEFAULT_MODELS["mock"] ?? {
      id: "mock",
      name: "Mock (Development)",
      provider: "mock",
      maxTokens: 10000,
      supportsStreaming: true,
      description: "Mock responses for development without API keys",
    }
  );
}

export function getModelById(id: string): AIModelConfig | undefined {
  // Check if it's a default model
  if (DEFAULT_MODELS[id]) {
    return DEFAULT_MODELS[id];
  }

  // Check if it's an Ollama model (starts with custom naming)
  if (id.startsWith("ollama:")) {
    return {
      id: id.replace("ollama:", ""),
      name: `${id.replace("ollama:", "")} (Local)`,
      provider: "ollama",
      maxTokens: 8192,
      supportsStreaming: true,
      description: "Local model via Ollama",
    };
  }

  return undefined;
}
