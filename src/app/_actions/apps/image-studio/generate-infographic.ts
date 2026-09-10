"use server";

import { UTFile } from "uploadthing/server";

import { utapi } from "@/app/api/uploadthing/lib";
import {
  DEFAULT_IMAGE_MODEL,
  OPENAI_IMAGE_MODEL,
  OPENAI_RESPONSES_MODEL,
  type ImageModelList,
} from "@/constants/image-models";
import { getOpenAIClient } from "@/lib/openai/client";
import { logger } from "@/lib/observability/server/logger";
import { createClient, getClerkUserId } from "@/lib/supabase/server";

type GenerateInfographicImageActionInput = {
  illustrationStyle?: string;
  layout?: string;
  model?: ImageModelList;
  prompt: string;
  apiKey?: string;
};

function buildInfographicPrompt({
  prompt,
  illustrationStyle,
  layout,
}: Required<
  Pick<
    GenerateInfographicImageActionInput,
    "illustrationStyle" | "layout" | "prompt"
  >
>) {
  return [
    "Create a polished, presentation-ready infographic image.",
    `Topic and source content: ${prompt}`,
    `Infographic layout: ${layout}.`,
    `Illustration style: ${illustrationStyle}.`,
    "Design requirements:",
    "- Build a clear visual hierarchy with one concise headline, short supporting labels, and meaningful grouped sections.",
    "- Use item labels of 20 characters or fewer and item descriptions of 60 characters or fewer.",
    "- For layout-based infographics such as timeline, process, comparison, hierarchy, cycle, roadmap, or matrix layouts, show only the strongest 4 to 5 visible items. Synthesize extra source details into those items instead of adding more sections.",
    "- Word clouds and chart-style visuals may include more items when useful.",
    "- Use accurate, readable text only; avoid misspellings, warped letters, fake words, and placeholder gibberish.",
    "- Convert the topic into a structured infographic with visual flow, icons, labels, connectors, and compact data callouts where useful.",
    "- Keep the composition uncluttered with generous spacing, strong alignment, and balanced margins for slide embedding.",
    "- Use a modern editorial presentation aesthetic with crisp vector-like shapes, high contrast, and clean typography.",
    "- Avoid photorealistic scenes unless the prompt explicitly requires them; prioritize diagrammatic explanation over decoration.",
    "- Do not include watermarks, UI chrome, browser frames, logos unless requested, QR codes, or stock-photo overlays.",
    "- The final output must be a single complete infographic image ready to place directly into a presentation.",
  ].join("\n");
}

export async function generateInfographicImageAction({
  illustrationStyle = "Bauhaus",
  layout = "Timeline",
  model = DEFAULT_IMAGE_MODEL,
  prompt,
  apiKey,
}: GenerateInfographicImageActionInput) {
  const trimmedPrompt = prompt.trim();
  const actionName = "apps.image-studio.generateInfographicImageAction";
  const span = logger.startSpan(`notebook.server_action.${actionName}`, {
    attributes: {
      "smart.scope": "notebook",
      "smart.action.type": "server_action",
      "smart.action.name": actionName,
      "smart.server.image_generation.prompt.length": trimmedPrompt.length,
      "smart.server.image_generation.requested_model": model,
    },
  });

  if (!trimmedPrompt) {
    span.end();
    return { success: false, error: "Prompt is required" };
  }

  const fullPrompt = buildInfographicPrompt({
    prompt: trimmedPrompt,
    illustrationStyle: illustrationStyle.trim() || "Bauhaus",
    layout: layout.trim() || "Timeline",
  });

  try {
    const actualModel = DEFAULT_IMAGE_MODEL;

    span.annotate({
      "smart.server.image_generation.authorized": true,
      "smart.server.image_generation.admin": false,
      "smart.server.image_generation.model": actualModel,
      "smart.server.image_generation.user_id": await getClerkUserId(),
    });
    span.event("smart.server.image_generation.started", {
      "smart.server.image_generation.model": actualModel,
    });

    const openai = await getOpenAIClient(apiKey);

    const response = await openai.responses.create({
      model: OPENAI_RESPONSES_MODEL,
      input: `Draw the following infographic image:\n${fullPrompt}`,
      tools: [
        {
          type: "image_generation",
          model: actualModel.replace("openai/", ""),
          size: "1536x1024",
          background: "opaque",
        },
      ],
    });

    const imageCalls = response.output.filter(
      (item: any) => item.type === "image_generation_call",
    ) as any[];

    const base64 = imageCalls[0]?.result;
    if (!base64) {
      throw new Error("Failed to generate infographic");
    }

    span.event("smart.server.image_generation.image_ready", {
      "smart.server.image_generation.source_url_available": true,
    });

    const imageBuffer = Buffer.from(base64, "base64");
    const filename = `infographic_${Date.now()}.png`;
    const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);
    const uploadResult = await utapi.uploadFiles([utFile]);
    const permanentUrl = uploadResult[0]?.data?.ufsUrl;

    if (!permanentUrl) {
      throw new Error("Failed to upload generated infographic");
    }

    span.event("smart.server.image_generation.upload_completed", {
      "smart.server.image_generation.uploaded": true,
    });

    const supabase = await createClient();
    if (!supabase) {
      throw new Error("Supabase is not configured");
    }

    const { data: generatedImage, error: insErr } = await supabase
      .from("generated_images")
      .insert({
        url: permanentUrl,
        prompt: fullPrompt,
        user_id: await getClerkUserId(),
      })
      .select("id, prompt, url")
      .single();

    if (insErr) throw insErr;

    span.event("smart.server.image_generation.completed", {
      "smart.server.image_generation.generated_image.id": generatedImage?.id,
    });

    return { success: true, image: generatedImage };
  } catch (error) {
    span.error(error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate infographic",
    };
  } finally {
    span.end();
  }
}
