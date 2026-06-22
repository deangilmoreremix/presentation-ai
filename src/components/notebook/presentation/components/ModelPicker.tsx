"use client";

import { createLogger } from "@/lib/observability/logger";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import {
  fallbackModels,
  getSelectedModel,
  setSelectedModel,
  useLocalModels,
} from "@/hooks/presentation/useLocalModels";
import { usePresentationState } from "@/states/presentation-state";
import { Bot, Cpu, Loader2, Monitor } from "lucide-react";
import { useEffect, useRef } from "react";

const modelPickerLogger = createLogger("client:model-picker");
const OPENAI_MODELS = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o-mini",
    description: "Fast cloud model for everyday presentation drafts",
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    description: "Balanced cloud model for higher quality drafts",
  },
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1-mini",
    description: "Efficient cloud model for structured generation",
  },
  {
    id: "gpt-4.1-nano",
    label: "GPT-4.1-nano",
    description: "Fastest, lowest-cost GPT-4.1 model",
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    description: "Stronger cloud model for complex presentations",
  },
  {
    id: "gpt-5.2",
    label: "GPT-5.2",
    description: "Latest flagship GPT model",
  },
  {
    id: "gpt-5.2-chat-latest",
    label: "GPT-5.2 Chat",
    description: "Latest ChatGPT-style GPT-5.2 model",
  },
  {
    id: "gpt-5.2-pro",
    label: "GPT-5.2 Pro",
    description: "More compute for harder problems",
  },
  {
    id: "gpt-5.1",
    label: "GPT-5.1",
    description: "Flagship GPT model with configurable reasoning",
  },
  {
    id: "gpt-5",
    label: "GPT-5",
    description: "Previous GPT-5 reasoning model",
  },
  {
    id: "gpt-5-mini",
    label: "GPT-5-mini",
    description: "Faster, cost-efficient GPT-5 model",
  },
  {
    id: "gpt-5-nano",
    label: "GPT-5-nano",
    description: "Fastest, most cost-efficient GPT-5 model",
  },
] as const;

function getOpenAIModel(modelId: string) {
  return (
    OPENAI_MODELS.find((model) => model.id === modelId) ?? OPENAI_MODELS[0]
  );
}

export function ModelPicker({
  shouldShowLabel = true,
}: {
  shouldShowLabel?: boolean;
}) {
  const { modelProvider, setModelProvider, modelId, setModelId } =
    usePresentationState();

  const { data: modelsData, isLoading, isInitialLoad } = useLocalModels();
  const hasRestoredFromStorage = useRef(false);

  useEffect(() => {
    if (!hasRestoredFromStorage.current) {
      const savedModel = getSelectedModel();
      if (savedModel) {
        modelPickerLogger.info("Restoring previously selected model", {
          modelProvider: savedModel.modelProvider,
          modelId: savedModel.modelId || "gpt-4o-mini",
        });
        setModelProvider(
          savedModel.modelProvider as "openai" | "ollama" | "lmstudio",
        );
        setModelId(savedModel.modelId);
      }
      hasRestoredFromStorage.current = true;
    }
  }, [setModelId, setModelProvider]);

  const displayData = modelsData || {
    localModels: [],
    downloadableModels: fallbackModels,
    showDownloadable: true,
  };

  const { localModels, downloadableModels, showDownloadable } = displayData;

  const ollamaModels = localModels.filter(
    (model) => model.provider === "ollama",
  );
  const lmStudioModels = localModels.filter(
    (model) => model.provider === "lmstudio",
  );
  const downloadableOllamaModels = downloadableModels.filter(
    (model) => model.provider === "ollama",
  );

  const createModelOption = (
    model: (typeof localModels)[0],
    isDownloadable = false,
  ) => ({
    id: model.id,
    label: model.name,
    displayLabel:
      model.provider === "ollama"
        ? `ollama ${model.name}`
        : `lm-studio ${model.name}`,
    icon: model.provider === "ollama" ? Cpu : Monitor,
    description: isDownloadable
      ? `Downloadable ${model.provider === "ollama" ? "Ollama" : "LM Studio"} model (will auto-download)`
      : `Local ${model.provider === "ollama" ? "Ollama" : "LM Studio"} model`,
  });

  const getCurrentModelValue = () => {
    if (modelProvider === "ollama") {
      return `ollama-${modelId}`;
    }

    if (modelProvider === "lmstudio") {
      return `lmstudio-${modelId}`;
    }

    return `openai-${getOpenAIModel(modelId).id}`;
  };

  const getCurrentModelOption = () => {
    const currentValue = getCurrentModelValue();

    if (modelProvider === "openai") {
      const currentModel = getOpenAIModel(modelId);
      return {
        label: currentModel.label,
        icon: Bot,
      };
    }

    const localModel = localModels.find((model) => model.id === currentValue);
    if (localModel) {
      return {
        label: localModel.name,
        icon: localModel.provider === "ollama" ? Cpu : Monitor,
      };
    }

    const downloadableModel = downloadableModels.find(
      (model) => model.id === currentValue,
    );
    if (downloadableModel) {
      return {
        label: downloadableModel.name,
        icon: downloadableModel.provider === "ollama" ? Cpu : Monitor,
      };
    }

    return {
      label: "Select model",
      icon: Bot,
    };
  };

  const handleModelChange = (value: string) => {
    if (value.startsWith("openai-")) {
      const selectedModelId = value.replace("openai-", "");
      const selectedModel = getOpenAIModel(selectedModelId);
      modelPickerLogger.info("Selected OpenAI model", {
        modelProvider: "openai",
        modelId: selectedModel.id,
      });
      setModelProvider("openai");
      setModelId(selectedModel.id);
      setSelectedModel("openai", selectedModel.id);
      return;
    }

    if (value.startsWith("ollama-")) {
      const model = value.replace("ollama-", "");
      const isDownloadableSelection = downloadableModels.some(
        (candidate) => candidate.id === value,
      );
      modelPickerLogger.info("Selected Ollama model", {
        modelProvider: "ollama",
        modelId: model,
        isDownloadableSelection,
      });
      if (isDownloadableSelection) {
        modelPickerLogger.info(
          "Selected a downloadable Ollama model suggestion; the server will download it on first use if needed",
          {
            modelProvider: "ollama",
            modelId: model,
          },
        );
      }
      setModelProvider("ollama");
      setModelId(model);
      setSelectedModel("ollama", model);
      return;
    }

    if (value.startsWith("lmstudio-")) {
      const model = value.replace("lmstudio-", "");
      modelPickerLogger.info("Selected LM Studio model", {
        modelProvider: "lmstudio",
        modelId: model,
      });
      setModelProvider("lmstudio");
      setModelId(model);
      setSelectedModel("lmstudio", model);
    }
  };

  return (
    <div className="min-w-0">
      {shouldShowLabel && (
        <label className="block text-xs font-medium text-muted-foreground">
          Text model
        </label>
      )}
      <Select value={getCurrentModelValue()} onValueChange={handleModelChange}>
        <SelectTrigger className="h-8 w-auto max-w-full gap-2 overflow-hidden rounded-full border-border bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent sm:h-9 sm:px-3.5 sm:text-sm">
          <div className="flex min-w-0 items-center gap-2">
            {(() => {
              const currentOption = getCurrentModelOption();
              const Icon = currentOption.icon;
              return <Icon className="h-4 w-4 flex-shrink-0" />;
            })()}
            <span className="truncate text-sm">
              {getCurrentModelOption().label}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent className="w-80 max-w-[calc(100vw-1rem)]">
          {isLoading && !isInitialLoad && (
            <SelectGroup>
              <SelectLabel>Loading Models</SelectLabel>
              <SelectItem value="loading" disabled className="overflow-hidden">
                <div className="flex min-w-0 max-w-full items-center gap-3">
                  <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                  <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <span className="truncate text-sm">
                      Refreshing models...
                    </span>
                    <span className="line-clamp-2 whitespace-normal break-words text-xs leading-snug text-muted-foreground">
                      Checking for new models
                    </span>
                  </div>
                </div>
              </SelectItem>
            </SelectGroup>
          )}

          <SelectGroup>
            <SelectLabel>Cloud Models</SelectLabel>
            {OPENAI_MODELS.map((model) => (
              <SelectItem
                key={model.id}
                value={`openai-${model.id}`}
                className="overflow-hidden"
              >
                <div className="flex min-w-0 max-w-full items-center gap-3">
                  <Bot className="h-4 w-4 flex-shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <span className="truncate text-sm">{model.label}</span>
                    <span className="line-clamp-2 whitespace-normal break-words text-xs leading-snug text-muted-foreground">
                      {model.description}
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>

          {ollamaModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Local Ollama Models</SelectLabel>
              {ollamaModels.map((model) => {
                const option = createModelOption(model);
                const Icon = option.icon;

                return (
                  <SelectItem
                    key={option.id}
                    value={option.id}
                    className="overflow-hidden"
                  >
                    <div className="flex min-w-0 max-w-full items-center gap-3">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                        <span className="truncate text-sm">
                          {option.displayLabel}
                        </span>
                        <span className="line-clamp-2 whitespace-normal break-words text-xs leading-snug text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          )}

          {lmStudioModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Local LM Studio Models</SelectLabel>
              {lmStudioModels.map((model) => {
                const option = createModelOption(model);
                const Icon = option.icon;

                return (
                  <SelectItem
                    key={option.id}
                    value={option.id}
                    className="overflow-hidden"
                  >
                    <div className="flex min-w-0 max-w-full items-center gap-3">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                        <span className="truncate text-sm">
                          {option.displayLabel}
                        </span>
                        <span className="line-clamp-2 whitespace-normal break-words text-xs leading-snug text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          )}

          {lmStudioModels.length === 0 && (
            <SelectGroup>
              <SelectLabel>LM Studio</SelectLabel>
              <SelectItem
                value="lmstudio-setup"
                disabled
                className="overflow-hidden"
              >
                <div className="flex min-w-0 max-w-full items-center gap-3">
                  <Monitor className="h-4 w-4 flex-shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <span className="line-clamp-2 whitespace-normal break-words text-sm leading-snug">
                      Start LM Studio to use local models
                    </span>
                    <span className="line-clamp-2 whitespace-normal break-words text-xs leading-snug text-muted-foreground">
                      Turn on the server and load a model to make it selectable
                    </span>
                  </div>
                </div>
              </SelectItem>
            </SelectGroup>
          )}

          {showDownloadable && downloadableOllamaModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Downloadable Ollama Models</SelectLabel>
              {downloadableOllamaModels.map((model) => {
                const option = createModelOption(model, true);
                const Icon = option.icon;

                return (
                  <SelectItem
                    key={option.id}
                    value={option.id}
                    className="overflow-hidden"
                  >
                    <div className="flex min-w-0 max-w-full items-center gap-3">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                        <span className="truncate text-sm">
                          {option.displayLabel}
                        </span>
                        <span className="line-clamp-2 whitespace-normal break-words text-xs leading-snug text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
