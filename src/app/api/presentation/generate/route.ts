import {
  assertModelIsConfigured,
  ensureModelIsReady,
  userModelPicker,
} from "@/lib/modelPicker";
import { createLogger } from "@/lib/observability/logger";
import {
  buildPresentationPromptValues,
  presentationGenerationPromptTemplate,
  type PresentationGenerationPromptInput,
} from "@/lib/presentation/generation-prompt";
import { auth } from "@/server/auth";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { RunnableSequence } from "@langchain/core/runnables";
import { createUIMessageStreamResponse } from "ai";
import { NextResponse } from "next/server";

interface SlidesRequest {
  title: string;
  prompt: string;
  outline: string[];
  language: string;
  tone: string;
  modelId?: string;
  modelProvider?: "openai" | "ollama" | "lmstudio";
  searchResults?: Array<{ query: string; results: unknown[] }>;
  textContent?: "minimal" | "concise" | "detailed" | "extensive";
  audience?: string;
  scenario?: string;
  imageSource?: "automatic" | "ai" | "stock";
  templateContext?: string;
  outlineTemplateHints?: Record<number, string>;
  selectedTemplateCount?: number;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const routeLogger = createLogger("api:presentation-generate");

  try {
    routeLogger.info("Presentation generation request received", { requestId });
    const session = await auth();

    const {
      title,
      prompt: userPrompt,
      outline,
      language,
      tone,
      modelId,
      modelProvider = "openai",
      searchResults,
      textContent,
      audience,
      scenario,
      imageSource,
      templateContext,
      outlineTemplateHints,
      selectedTemplateCount,
    } = (await req.json()) as SlidesRequest;

    if (!title || !outline || !Array.isArray(outline) || !language) {
      routeLogger.warn(
        "Presentation generation request rejected: missing required fields",
        {
          requestId,
          hasTitle: Boolean(title),
          hasOutline: Array.isArray(outline),
          language,
        },
      );
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const totalSlides = outline.length;
    const templateCount = selectedTemplateCount ?? 0;

    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    routeLogger.info("Validated presentation generation request", {
      requestId,
      title,
      totalSlides,
      language,
      tone,
      modelProvider,
      modelId: modelId || "gpt-4o-mini",
      imageSource: imageSource || "automatic",
      templateCount,
    });
    try {
      assertModelIsConfigured(modelProvider, modelId);
    } catch (error) {
      routeLogger.error(
        "Presentation generation request rejected: invalid model configuration",
        error,
        {
          requestId,
          modelProvider,
          modelId: modelId || "gpt-4o-mini",
        },
      );
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid model configuration",
        },
        { status: 400 },
      );
    }
    try {
      await ensureModelIsReady(modelProvider, modelId);
    } catch (error) {
      routeLogger.error(
        "Presentation generation request rejected: selected model could not be prepared",
        error,
        {
          requestId,
          modelProvider,
          modelId: modelId || "gpt-4o-mini",
        },
      );
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to prepare selected model",
        },
        { status: 503 },
      );
    }
    const model = await userModelPicker(session!.user.id, modelProvider, modelId);
    const chain = RunnableSequence.from([
      presentationGenerationPromptTemplate,
      model,
    ]);

    routeLogger.info("Presentation generation started", {
      requestId,
      title,
      totalSlides,
      modelProvider,
      modelId: modelId || "gpt-4o-mini",
    });

    const promptInput: PresentationGenerationPromptInput = {
      title,
      prompt: userPrompt ?? "",
      outline,
      language,
      tone,
      searchResults,
      textContent,
      audience,
      scenario,
      imageSource,
      templateContext,
      presentationTemplateContext: undefined,
      outlineTemplateHints,
      selectedTemplateCount: templateCount,
      currentDate,
      imageSearchResults: undefined,
      selectedChunks: undefined,
    };

    const stream = await chain.stream(buildPresentationPromptValues(promptInput));

    routeLogger.info("Presentation generation stream created", {
      requestId,
      title,
      totalSlides,
    });
    return createUIMessageStreamResponse({ stream: toUIMessageStream(stream) });
  } catch (error) {
    routeLogger.error("Presentation generation failed", error, { requestId });
    return NextResponse.json(
      { error: "Failed to generate presentation slides" },
      { status: 500 },
    );
  }
}
