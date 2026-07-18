import { env } from "@/env";
import { createLogger } from "@/lib/observability/logger";
import { ChatOpenAI } from "@langchain/openai";

type ModelProvider = "openai" | "lmstudio";
const modelLogger = createLogger("model-picker");
const LM_STUDIO_BASE_URL = "http://localhost:1234";
const LM_STUDIO_API_BASE_URL = `${LM_STUDIO_BASE_URL}/v1`;
const LM_STUDIO_MODELS_URLS = [
  `${LM_STUDIO_API_BASE_URL}/models`,
  `${LM_STUDIO_BASE_URL}/api/v0/models`,
] as const;

function extractLMStudioModelIds(payload: unknown): string[] {
  const candidateArrays: unknown[][] = [
    Array.isArray((payload as { data?: unknown[] } | null)?.data)
      ? ((payload as { data: unknown[] }).data ?? [])
      : [],
    Array.isArray((payload as { models?: unknown[] } | null)?.models)
      ? ((payload as { models: unknown[] }).models ?? [])
      : [],
    Array.isArray(payload) ? payload : [],
  ];

  const modelIds = candidateArrays.flatMap((candidates) =>
    candidates.flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        return [];
      }

      const record = candidate as Record<string, unknown>;
      const modelId = [record.id, record.model, record.modelKey, record.name].find(
        (value) => typeof value === "string" && value.trim().length > 0,
      );

      return typeof modelId === "string" ? [modelId.trim()] : [];
    }),
  );

  return [...new Set(modelIds)];
}

function isModelProvider(value: string): value is ModelProvider {
  return value === "openai" || value === "lmstudio";
}

function resolveModelSelection(
  modelProviderOrModel: string,
  modelId?: string,
): {
  provider: ModelProvider;
  modelId?: string;
} {
  if (isModelProvider(modelProviderOrModel)) {
    return {
      provider: modelProviderOrModel,
      modelId,
    };
  }

  return {
    provider: "openai",
    modelId: modelProviderOrModel,
  };
}

async function fetchInstalledLMStudioModels(): Promise<Set<string>> {
  let lastError: Error | null = null;
  let receivedResponse = false;

  for (const url of LM_STUDIO_MODELS_URLS) {
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`LM Studio responded with ${response.status}`);
      }

      receivedResponse = true;
      const modelIds = extractLMStudioModelIds(await response.json());

      modelLogger.info("Fetched LM Studio model catalog", {
        provider: "lmstudio",
        source: url,
        count: modelIds.length,
      });

      return new Set(modelIds);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (receivedResponse) {
    return new Set();
  }

  throw new Error(
    lastError?.message ??
      "LM Studio is not available. Start LM Studio and try again.",
  );
}

async function ensureLMStudioModelIsReady(modelId: string): Promise<void> {
  const availableModels = await fetchInstalledLMStudioModels();

  if (availableModels.has(modelId)) {
    modelLogger.info("LM Studio model is available", {
      provider: "lmstudio",
      modelId,
    });
    return;
  }

  if (availableModels.size === 0) {
    throw new Error(
      `LM Studio is running but no models are currently available. Load "${modelId}" in LM Studio and try again.`,
    );
  }

  throw new Error(
    `LM Studio model "${modelId}" is not available. Load it in LM Studio and make sure the local server is running.`,
  );
}

export function assertModelIsConfigured(
  modelProviderOrModel: string,
  modelId?: string,
) {
  const selection = resolveModelSelection(modelProviderOrModel, modelId);
  const selectedOpenAIModel = selection.modelId || "gpt-4o-mini";
  const selectedLocalModel = selection.modelId?.trim();

  if (selection.provider === "lmstudio" && !selectedLocalModel) {
    modelLogger.error("Model configuration failed", undefined, {
      provider: selection.provider,
      reason: "missing_model_id",
    });
    throw new Error("An LM Studio model must be selected before continuing.");
  }

  if (selection.provider === "openai" && !env.OPENAI_API_KEY?.trim()) {
    modelLogger.error("Model configuration failed", undefined, {
      provider: selection.provider,
      modelId: selectedOpenAIModel,
      reason: "missing_openai_api_key",
    });
    throw new Error(
      `OPENAI_API_KEY is required when using the OpenAI model "${selectedOpenAIModel}".`,
    );
  }

  modelLogger.info("Model configuration validated", {
    provider: selection.provider,
    modelId:
      selection.provider === "openai"
        ? selectedOpenAIModel
        : selectedLocalModel || undefined,
  });
}

export async function ensureModelIsReady(
  modelProviderOrModel: string,
  modelId?: string,
) {
  const selection = resolveModelSelection(modelProviderOrModel, modelId);
  if (!selection.modelId) {
    return;
  }

  if (selection.provider === "lmstudio") {
    await ensureLMStudioModelIsReady(selection.modelId);
  }
}

/**
 * Centralized model picker for LangChain-based presentation routes.
 * Supports OpenAI and OpenAI-compatible local endpoints.
 */
export function modelPicker(
  modelProviderOrModel: string,
  modelId?: string,
  apiKey?: string | null,
) {
  const selection = resolveModelSelection(modelProviderOrModel, modelId);

  if (selection.provider === "lmstudio") {
    if (!selection.modelId) {
      throw new Error("An LM Studio model must be selected before continuing.");
    }

    modelLogger.info("Creating LM Studio model client", {
      provider: selection.provider,
      modelId: selection.modelId,
      baseUrl: LM_STUDIO_API_BASE_URL,
    });

    return new ChatOpenAI({
      model: selection.modelId,
      apiKey: "lmstudio",
      configuration: {
        baseURL: LM_STUDIO_API_BASE_URL,
      },
    });
  }

  const selectedOpenAIModel = selection.modelId || "gpt-4o-mini";
  const openAIApiKey = apiKey?.trim() || env.OPENAI_API_KEY?.trim();

  modelLogger.info("Creating OpenAI model client", {
    provider: selection.provider,
    modelId: selectedOpenAIModel,
    hasApiKey: Boolean(openAIApiKey),
  });

  return new ChatOpenAI({
    model: selectedOpenAIModel,
    ...(openAIApiKey ? { apiKey: openAIApiKey } : {}),
  });
}
