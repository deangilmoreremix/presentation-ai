import { env } from '@/env';

export interface FeatureFlags {
  aiGeneration: boolean;
  imageGeneration: boolean;
  webSearch: boolean;
  localModels: boolean;
  cloudModels: boolean;
  authentication: boolean;
  googleOAuth: boolean;
  credentialsAuth: boolean;
  export: boolean;
  presentationMode: boolean;
  themes: boolean;
  customThemes: boolean;
  richTextEditor: boolean;
  dragAndDrop: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  const hasOpenAI = !!env.OPENAI_API_KEY;
  const hasTogether = !!env.TOGETHER_AI_API_KEY;
  const hasOllama = !!env.OLLAMA_BASE_URL;
  const hasLMStudio = !!env.LM_STUDIO_BASE_URL;
  const hasGoogleOAuth = !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
  const hasImageGen = !!env.FAL_API_KEY || !!env.UNSPLASH_ACCESS_KEY;
  const hasWebSearch = !!env.TAVILY_API_KEY;
  const isDev = env.NODE_ENV === 'development';

  return {
    aiGeneration: hasOpenAI || hasTogether || hasOllama || hasLMStudio || true,
    imageGeneration: hasImageGen || true,
    webSearch: hasWebSearch || true,
    localModels: hasOllama || hasLMStudio,
    cloudModels: hasOpenAI || hasTogether,
    authentication: hasGoogleOAuth || isDev,
    googleOAuth: hasGoogleOAuth,
    credentialsAuth: isDev || hasGoogleOAuth,
    export: true,
    presentationMode: true,
    themes: true,
    customThemes: true,
    richTextEditor: true,
    dragAndDrop: true,
  };
}

export function isAIGenerationAvailable(): boolean {
  return getFeatureFlags().aiGeneration;
}

export function isCloudAIAvailable(): boolean {
  return getFeatureFlags().cloudModels;
}

export function isLocalAIAvailable(): boolean {
  return getFeatureFlags().localModels;
}

export function getActiveAIProviders(): string[] {
  const providers: string[] = [];

  if (env.OPENAI_API_KEY) providers.push('openai');
  if (env.TOGETHER_AI_API_KEY) providers.push('together');
  if (env.OLLAMA_BASE_URL) providers.push('ollama');
  if (env.LM_STUDIO_BASE_URL) providers.push('lmstudio');

  return providers;
}
