import { type AIProviderType, DEFAULT_MODELS, getDefaultModel } from "@/config/ai";
import { env } from "@/env";
import { MockProvider } from "./mock/provider";
import { type AIModelConfig, type AIProvider } from "./types";

export function createAIProvider(type?: AIProviderType): AIProvider {
  const providerType = type || getDefaultModel().provider;

  switch (providerType) {
    case "openai":
      if (!env.OPENAI_API_KEY) {
        console.warn("OpenAI API key not found, falling back to mock provider");
        return new MockProvider();
      }
      return createOpenAIProvider();

    case "together":
      if (!env.TOGETHER_AI_API_KEY) {
        console.warn(
          "Together AI API key not found, falling back to mock provider",
        );
        return new MockProvider();
      }
      return createTogetherProvider();

    case "ollama":
      if (!env.OLLAMA_BASE_URL) {
        console.warn("Ollama not configured, falling back to mock provider");
        return new MockProvider();
      }
      return createOllamaProvider();

    case "lmstudio":
      if (!env.LM_STUDIO_BASE_URL) {
        console.warn("LM Studio not configured, falling back to mock provider");
        return new MockProvider();
      }
      return createLMStudioProvider();

    default:
      return new MockProvider();
  }
}

const openaiModels = Object.values(DEFAULT_MODELS).filter(
  (m): m is AIModelConfig => m?.provider === "openai",
);
const togetherModels = Object.values(DEFAULT_MODELS).filter(
  (m): m is AIModelConfig => m?.provider === "together",
);
const ollamaModels = Object.values(DEFAULT_MODELS).filter(
  (m): m is AIModelConfig => m?.provider === "ollama",
);
const lmstudioModels = Object.values(DEFAULT_MODELS).filter(
  (m): m is AIModelConfig => m?.provider === "lmstudio",
);

function createOpenAIProvider(): AIProvider {
  return {
    type: "openai",
    isAvailable: true,
    async complete(options) {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: options.model,
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096,
            tools: options.tools,
            tool_choice: options.toolChoice,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      return {
        text: data.choices[0]?.message?.content || "",
        toolCalls: data.choices[0]?.message?.tool_calls?.map(
          (tc: { function: { name: string; arguments: string } }) => ({
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments),
          }),
        ),
        finishReason: data.choices[0]?.finish_reason || "stop",
      };
    },

    async *stream(options) {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: options.model,
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096,
            stream: true,
            tools: options.tools,
            tool_choice: options.toolChoice,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                yield { type: "done" };
                return;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  yield { type: "text", text: content };
                }
                if (parsed.choices?.[0]?.delta?.tool_calls) {
                  for (const tc of parsed.choices[0].delta.tool_calls) {
                    yield {
                      type: "tool-call",
                      toolCall: {
                        name: tc.function?.name || "",
                        args: tc.function?.arguments
                          ? JSON.parse(tc.function.arguments)
                          : {},
                      },
                    };
                  }
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },

    getAvailableModels() {
      return openaiModels;
    },

    getDefaultModel() {
      return (
        DEFAULT_MODELS["gpt-4o-mini"] ?? {
          id: "gpt-4o-mini",
          name: "GPT-4o Mini",
          provider: "openai",
          maxTokens: 128000,
          supportsStreaming: true,
          description: "Fast and affordable GPT-4 model",
        }
      );
    },

    async healthCheck() {
      try {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        });
        return response.ok;
      } catch {
        return false;
      }
    },
  };
}

function createTogetherProvider(): AIProvider {
  return {
    type: "together",
    isAvailable: true,
    async complete(options) {
      const response = await fetch(
        "https://api.together.xyz/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.TOGETHER_AI_API_KEY}`,
          },
          body: JSON.stringify({
            model: options.model,
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096,
            tools: options.tools,
            tool_choice: options.toolChoice,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Together AI API error: ${error}`);
      }

      const data = await response.json();
      return {
        text: data.choices[0]?.message?.content || "",
        toolCalls: data.choices[0]?.message?.tool_calls?.map(
          (tc: { function: { name: string; arguments: string } }) => ({
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments),
          }),
        ),
        finishReason: data.choices[0]?.finish_reason || "stop",
      };
    },

    async *stream(options) {
      const response = await fetch(
        "https://api.together.xyz/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.TOGETHER_AI_API_KEY}`,
          },
          body: JSON.stringify({
            model: options.model,
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096,
            stream: true,
            tools: options.tools,
            tool_choice: options.toolChoice,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Together AI API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                yield { type: "done" };
                return;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  yield { type: "text", text: content };
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },

    getAvailableModels() {
      return togetherModels;
    },

    getDefaultModel() {
      return (
        DEFAULT_MODELS["llama-3.1-8b"] ?? {
          id: "meta-llama/Llama-3.1-8B-Instruct-Turbo",
          name: "Llama 3.1 8B",
          provider: "together",
          maxTokens: 128000,
          supportsStreaming: true,
          description: "Meta's open source model via Together AI",
        }
      );
    },

    async healthCheck() {
      try {
        const response = await fetch("https://api.together.xyz/v1/models", {
          headers: { Authorization: `Bearer ${env.TOGETHER_AI_API_KEY}` },
        });
        return response.ok;
      } catch {
        return false;
      }
    },
  };
}

function createOllamaProvider(): AIProvider {
  const baseUrl = env.OLLAMA_BASE_URL || "http://localhost:11434";

  return {
    type: "ollama",
    isAvailable: true,
    async complete(options) {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${error}`);
      }

      const data = await response.json();
      return {
        text: data.message?.content || "",
        finishReason: "stop",
      };
    },

    async *stream(options) {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n").filter(Boolean);

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                yield { type: "text", text: parsed.message.content };
              }
              if (parsed.done) {
                yield { type: "done" };
                return;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },

    getAvailableModels() {
      return ollamaModels;
    },

    getDefaultModel() {
      return (
        DEFAULT_MODELS["ollama-llama3"] ?? {
          id: "llama3.1",
          name: "Llama 3.1 (Local)",
          provider: "ollama",
          maxTokens: 8192,
          supportsStreaming: true,
          description: "Local Llama 3.1 via Ollama",
        }
      );
    },

    async healthCheck() {
      try {
        const response = await fetch(`${baseUrl}/api/tags`);
        return response.ok;
      } catch {
        return false;
      }
    },
  };
}

function createLMStudioProvider(): AIProvider {
  const baseUrl = env.LM_STUDIO_BASE_URL || "http://localhost:1234/v1";

  return {
    type: "lmstudio",
    isAvailable: true,
    async complete(options) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "local-model",
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LM Studio API error: ${error}`);
      }

      const data = await response.json();
      return {
        text: data.choices[0]?.message?.content || "",
        finishReason: data.choices[0]?.finish_reason || "stop",
      };
    },

    async *stream(options) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "local-model",
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                yield { type: "done" };
                return;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  yield { type: "text", text: content };
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },

    getAvailableModels() {
      return lmstudioModels;
    },

    getDefaultModel() {
      return (
        DEFAULT_MODELS["lmstudio"] ?? {
          id: "local-model",
          name: "Local Model (LM Studio)",
          provider: "lmstudio",
          maxTokens: 8192,
          supportsStreaming: true,
          description: "Any model loaded in LM Studio",
        }
      );
    },

    async healthCheck() {
      try {
        const response = await fetch(`${baseUrl}/models`);
        return response.ok;
      } catch {
        return false;
      }
    },
  };
}
