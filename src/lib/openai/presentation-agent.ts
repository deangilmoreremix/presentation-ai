import { createResponsesClient } from "@/lib/openai/responses";
import { fetchCRMData, fetchCalendarEvents } from "@/lib/mcp/client";

interface PresentationAgentOptions {
  prompt: string;
  audience?: "ceo" | "investor" | "customer" | "team" | "general";
  tone?: "professional" | "persuasive" | "inspiring" | "instructive" | "engaging";
  style?: "business" | "creative" | "academic" | "casual";
  numSlides?: number;
  includeResearch?: boolean;
  includeSpeakerNotes?: boolean;
  leadId?: string;
  userId?: string;
  vectorStoreId?: string;
}

interface PresentationResult {
  slides: Array<{
    id: string;
    layout: string;
    title: string;
    content?: string;
    bullets?: string[];
    visual?: { type: string; query: string };
    speakerNotes?: string;
  }>;
  theme: Record<string, unknown>;
  citations: Array<{ source: string; url: string; title: string; slideIds: string[] }>;
  outline: string[];
  responseId?: string;
}

export class PresentationAgent {
  private userId?: string;
  private previousResponseId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  async generatePresentation(options: PresentationAgentOptions): Promise<PresentationResult> {
    let crmData: Record<string, unknown> | undefined;
    let calendarEvents: Record<string, unknown>[] = [];

    if (options.leadId) {
      crmData = await fetchCRMData(options.leadId, this.userId);
      calendarEvents = await fetchCalendarEvents(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        this.userId
      );
    }

    const instructions = this.buildInstructions(options, crmData, calendarEvents);

    const client = await createResponsesClient(this.userId);

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: options.prompt,
      instructions,
      tools: [
        { type: "web_search" },
        { type: "image_generation" },
        { type: "code_interpreter" },
      ] as any,
      store: true,
    });

    this.previousResponseId = response.id as string | undefined;

    const parsed = this.parseSlidesResponse(response as any);
    return {
      slides: parsed.slides,
      theme: parsed.theme,
      citations: parsed.citations,
      outline: parsed.outline,
      responseId: response.id as string | undefined,
    };
  }

  async refinePresentation(
    refinement: string,
    presentation: PresentationResult
  ): Promise<PresentationResult> {
    const client = await createResponsesClient(this.userId);

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: refinement,
      instructions: `You are refining an existing presentation. The current slides are: ${JSON.stringify(presentation.slides)}`,
      previous_response_id: this.previousResponseId,
      store: true,
      tools: [
        { type: "web_search" },
        { type: "image_generation" },
      ] as any,
    });

    this.previousResponseId = response.id as string | undefined;
    const parsed = this.parseSlidesResponse(response as any);

    return {
      slides: parsed.slides || presentation.slides,
      theme: parsed.theme || presentation.theme,
      citations: [...presentation.citations, ...parsed.citations],
      outline: presentation.outline,
      responseId: response.id as string | undefined,
    };
  }

  async generateOutline(options: PresentationAgentOptions): Promise<string[]> {
    const client = await createResponsesClient(this.userId);

    const instructions = this.buildOutlineInstructions(options);

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: options.prompt,
      instructions,
      tools: options.includeResearch ? [{ type: "web_search" }] as any : [],
      store: true,
    });

    this.previousResponseId = response.id as string | undefined;
    return this.parseOutlineResponse(response as any);
  }

  async generateTheme(themePrompt: string): Promise<Record<string, unknown>> {
    const client = await createResponsesClient(this.userId);

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: themePrompt,
      instructions: "You are a presentation design expert. Create a cohesive theme based on the user's description.",
      store: false,
    });

    return this.parseThemeResponse(response as any);
  }

  private buildInstructions(
    options: PresentationAgentOptions,
    crmData?: Record<string, unknown>,
    calendarEvents: Record<string, unknown>[] = []
  ): string {
    let context = `You are an expert presentation designer creating a ${options.numSlides || 10}-slide presentation.\n\n`;
    
    context += `AUDIENCE: ${options.audience || "general"}\n`;
    context += `TONE: ${options.tone || "professional"}\n`;
    context += `STYLE: ${options.style || "business"}\n\n`;

    if (crmData) {
      context += `CRM CONTEXT:\n${JSON.stringify(crmData, null, 2)}\n\n`;
    }

    if (calendarEvents.length > 0) {
      context += `UPCOMING EVENTS:\n${JSON.stringify(calendarEvents, null, 2)}\n\n`;
    }

    context += `WORKFLOW:
1. Research the topic using web search if needed
2. Create a structured outline with slide titles
3. Generate detailed slide content with visuals
4. Write speaker notes for each slide
5. Include citations for any external data
6. Return ONLY valid JSON matching the schema

Each slide must have:
- id: unique identifier
- layout: appropriate layout type
- title: compelling headline
- bullets: 3-5 key points (if applicable)
- visual: image query or chart specification
- speakerNotes: talking points for the presenter`;

    return context;
  }

  private buildOutlineInstructions(options: PresentationAgentOptions): string {
    return `Create a presentation outline for: "${options.prompt}"

AUDIENCE: ${options.audience || "general"}
TONE: ${options.tone || "professional"}
TARGET: ${options.numSlides || 10} slides

Return a JSON array of outline items, each with:
- id: unique identifier
- title: slide title
- description: what this slide covers
- estimatedSlides: how many slides this section needs

Research the topic for accuracy.`;
  }

  private parseSlidesResponse(response: any): any {
    const output = response.output?.find((item: any) => item.type === "message");
    if (!output?.content?.[0]?.text) {
      return { slides: [], theme: {}, citations: [] };
    }

    try {
      const parsed = JSON.parse(output.content[0].text);
      return {
        slides: parsed.slides || [],
        theme: parsed.theme || {},
        citations: parsed.citations || [],
      };
    } catch {
      return { slides: [], theme: {}, citations: [] };
    }
  }

  private parseOutlineResponse(response: any): string[] {
    const output = response.output?.find((item: any) => item.type === "message");
    if (!output?.content?.[0]?.text) {
      return [];
    }

    try {
      const parsed = JSON.parse(output.content[0].text);
      return parsed.outline || parsed.slides || [];
    } catch {
      return [];
    }
  }

  private parseThemeResponse(response: any): Record<string, unknown> {
    const output = response.output?.find((item: any) => item.type === "message");
    if (!output?.content?.[0]?.text) {
      return {};
    }

    try {
      const parsed = JSON.parse(output.content[0].text);
      return parsed.theme || {};
    } catch {
      return {};
    }
  }

  getResponseId(): string | undefined {
    return this.previousResponseId;
  }
}
