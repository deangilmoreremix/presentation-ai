export interface SlideParams {
  outlineItem: string;
  theme?: string;
  style?: "professional" | "casual" | "academic" | "creative";
  includeImage?: boolean;
  includeNotes?: boolean;
}

export interface SlideContent {
  title: string;
  content: string;
  layout: string;
  imageQuery?: string;
  speakerNotes?: string;
}

export interface ThemeParams {
  prompt: string;
  baseTheme?: string;
}

export interface ChartParams {
  data: Record<string, unknown>[];
  chartType: "bar" | "line" | "pie" | "area" | "radar" | "scatter";
  title?: string;
}

export const PRESENTATION_TOOLS = [
  {
    type: "function",
    name: "generateSlide",
    description: "Generate a single presentation slide with the given outline item",
    parameters: {
      type: "object",
      properties: {
        outlineItem: {
          type: "string",
          description: "The outline point to create a slide for",
        },
        theme: {
          type: "string",
          description: "Theme style to apply",
        },
        style: {
          type: "string",
          enum: ["professional", "casual", "academic", "creative"],
          description: "Presentation style",
        },
        includeImage: {
          type: "boolean",
          description: "Whether to include image generation",
        },
        includeNotes: {
          type: "boolean",
          description: "Whether to generate speaker notes",
        },
      },
      required: ["outlineItem"],
    },
  },
  {
    type: "function",
    name: "generateTheme",
    description: "Create a custom presentation theme based on a text description",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Description of the desired theme",
        },
        baseTheme: {
          type: "string",
          description: "Base theme to modify",
        },
      },
      required: ["prompt"],
    },
  },
  {
    type: "function",
    name: "generateSpeakerNotes",
    description: "Generate speaker notes for a slide",
    parameters: {
      type: "object",
      properties: {
        slideTitle: {
          type: "string",
          description: "The slide title",
        },
        slideContent: {
          type: "string",
          description: "The slide content in XML format",
        },
        audience: {
          type: "string",
          description: "Target audience type",
        },
        tone: {
          type: "string",
          description: "Presentation tone",
        },
      },
      required: ["slideTitle", "slideContent"],
    },
  },
  {
    type: "function",
    name: "generateChart",
    description: "Generate chart data or visualization for a slide",
    parameters: {
      type: "object",
      properties: {
        data: {
          type: "array",
          description: "Data points for the chart",
        },
        chartType: {
          type: "string",
          enum: ["bar", "line", "pie", "area", "radar", "scatter"],
          description: "Type of chart to generate",
        },
        title: {
          type: "string",
          description: "Chart title",
        },
      },
      required: ["data", "chartType"],
    },
  },
  {
    type: "web_search",
  },
  {
    type: "image_generation",
  },
  {
    type: "code_interpreter",
  },
];

// Tool implementations that will be called when the AI responds with tool calls
export async function executeToolCall(toolCall: {
  id: string;
  type: string;
  function?: { name: string; arguments: string };
}): Promise<{
  tool_call_id: string;
  output: unknown;
}> {
  const { id, type, function: func } = toolCall;

  if (type === "web_search" || type === "image_generation" || type === "code_interpreter") {
    // These are handled natively by OpenAI, no client-side implementation needed
    return { tool_call_id: id, output: { status: "native_tool" } };
  }

  if (func?.name === "generateSlide") {
    const args = JSON.parse(func.arguments) as SlideParams;
    // Implementation for slide generation
    const slideContent: SlideContent = {
      title: args.outlineItem.split(".")[1]?.trim() || args.outlineItem,
      content: `Content for: ${args.outlineItem}`,
      layout: args.style === "creative" ? "CYCLE" : "BULLETS",
      imageQuery: args.includeImage ? `${args.outlineItem} professional illustration` : undefined,
      speakerNotes: args.includeNotes ? `Notes for slide about ${args.outlineItem}` : undefined,
    };
    return { tool_call_id: id, output: slideContent };
  }

  if (func?.name === "generateTheme") {
    const args = JSON.parse(func.arguments) as ThemeParams;
    // Implementation for theme generation
    const themeData = {
      name: args.prompt.substring(0, 30),
      colors: {
        primary: "#3B82F6",
        secondary: "#10B981",
        accent: "#F59E0B",
      },
      fonts: {
        heading: "Inter",
        body: "Inter",
      },
    };
    return { tool_call_id: id, output: themeData };
  }

  if (func?.name === "generateSpeakerNotes") {
    const args = JSON.parse(func.arguments);
    return {
      tool_call_id: id,
      output: `Speaker notes for "${args.slideTitle}": Professional talking points and key insights for presenting this slide effectively.`,
    };
  }

  if (func?.name === "generateChart") {
    const args = JSON.parse(func.arguments) as ChartParams;
    return {
      tool_call_id: id,
      output: {
        chartType: args.chartType,
        data: args.data,
        title: args.title,
      },
    };
  }

  return { tool_call_id: id, output: { error: "Unknown tool" } };
}