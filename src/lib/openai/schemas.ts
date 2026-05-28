export const SLIDE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "presentation_slides",
    strict: true,
    schema: {
      type: "object",
      properties: {
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              layout: { 
                type: "string",
                enum: ["title", "content", "image", "two-column", "bullets", "icon-grid", "comparison", "timeline", "chart", "table"]
              },
              title: { type: "string" },
              content: { type: "string" },
              bullets: {
                type: "array",
                items: { type: "string" }
              },
              visual: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["image", "chart", "infographic", "diagram"] },
                  query: { type: "string" },
                  alt: { type: "string" }
                }
              },
              speakerNotes: { type: "string" },
              animation: {
                type: "object",
                properties: {
                  transition: { type: "string", enum: ["fade", "slide", "zoom", "flip", "none"] },
                  duration: { type: "number" }
                }
              }
            },
            required: ["id", "layout", "title"]
          }
        },
        theme: {
          type: "object",
          properties: {
            name: { type: "string" },
            primaryColor: { type: "string" },
            secondaryColor: { type: "string" },
            fontFamily: { type: "string" },
            style: { type: "string", enum: ["professional", "minimal", "bold", "futuristic", "playful"] }
          }
        },
        citations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source: { type: "string" },
              url: { type: "string" },
              title: { type: "string" },
              slideIds: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        }
      },
      required: ["slides"]
    }
  }
} as const;

export const THEME_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "presentation_theme",
    strict: true,
    schema: {
      type: "object",
      properties: {
        theme: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            mode: { type: "string", enum: ["light", "dark"] },
            colors: {
              type: "object",
              properties: {
                primary: { type: "string" },
                accent: { type: "string" },
                background: { type: "string" },
                text: { type: "string" },
                heading: { type: "string" },
                smartLayout: { type: "string" },
                cardBackground: { type: "string" }
              },
              required: ["primary", "accent", "background", "text", "heading"]
            },
            fonts: {
              type: "object",
              properties: {
                heading: { type: "string" },
                body: { type: "string" },
                headingWeight: { type: "number" },
                bodyWeight: { type: "number" }
              },
              required: ["heading", "body"]
            },
            borderRadius: {
              type: "object",
              properties: {
                card: { type: "string" },
                slide: { type: "string" },
                button: { type: "string" }
              }
            },
            transitions: {
              type: "object",
              properties: {
                default: { type: "string" }
              }
            },
            shadows: {
              type: "object",
              properties: {
                card: { type: "string" },
                button: { type: "string" },
                slide: { type: "string" }
              }
            }
          },
          required: ["name", "colors", "fonts"]
        }
      },
      required: ["theme"]
    }
  }
} as const;

export const OUTLINE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "presentation_outline",
    strict: true,
    schema: {
      type: "object",
      properties: {
        outline: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              estimatedSlides: { type: "number" }
            }
          }
        },
        researchFindings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              query: { type: "string" },
              findings: { type: "string" },
              source: { type: "string" }
            }
          }
        },
        recommendedFlow: {
          type: "string"
        }
      },
      required: ["outline"]
    }
  }
} as const;

export type SlideLayout = "title" | "content" | "image" | "two-column" | "bullets" | "icon-grid" | "comparison" | "timeline" | "chart" | "table";

export interface SlideSchema {
  id: string;
  layout: SlideLayout;
  title: string;
  content?: string;
  bullets?: string[];
  visual?: {
    type: "image" | "chart" | "infographic" | "diagram";
    query: string;
    alt?: string;
  };
  speakerNotes?: string;
  animation?: {
    transition: "fade" | "slide" | "zoom" | "flip" | "none";
    duration: number;
  };
}

export interface ThemeSchema {
  name: string;
  description?: string;
  mode?: "light" | "dark";
  colors?: {
    primary: string;
    accent: string;
    background: string;
    text: string;
    heading: string;
    smartLayout?: string;
    cardBackground?: string;
  };
  fonts?: {
    heading: string;
    body: string;
    headingWeight?: number;
    bodyWeight?: number;
  };
  borderRadius?: {
    card: string;
    slide: string;
    button: string;
  };
  transitions?: {
    default: string;
  };
  shadows?: {
    card: string;
    button: string;
    slide: string;
  };
}

export interface Citation {
  source: string;
  url: string;
  title: string;
  slideIds: string[];
}
