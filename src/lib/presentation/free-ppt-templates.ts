import { type PlateSlide } from "@/components/notebook/presentation/utils/parser";

/**
 * Catalog entry from https://github.com/deangilmoreremix/free-ppt-template
 * (bundled snapshot in src/data/free-ppt-templates.json, refreshed with
 * `pnpm templates:sync`). Decks and previews are CC BY 4.0, hosted on
 * cdn.ppttemplate.ai.
 */
export interface FreePptTemplate {
  slug: string;
  title: string;
  description: string;
  category: string;
  categoryName: string;
  type: "presentation" | "document" | "spreadsheet";
  slideCount: number;
  tags: string[];
  colors: string[];
}

export interface FreePptCategory {
  id: string;
  name: string;
  count: number;
}

export const FREE_PPT_TEMPLATE_CDN = "https://cdn.ppttemplate.ai/templates";
export const FREE_PPT_TEMPLATE_SOURCE_URL =
  "https://github.com/deangilmoreremix/free-ppt-template";

export async function loadFreePptTemplates(): Promise<FreePptTemplate[]> {
  const mod = await import("@/data/free-ppt-templates.json");
  return mod.default as FreePptTemplate[];
}

function templateBase(slug: string): string {
  return `${FREE_PPT_TEMPLATE_CDN}/${slug}/v3`;
}

export function getFreePptPreviewUrls(template: FreePptTemplate): string[] {
  const base = templateBase(template.slug);
  return Array.from(
    { length: template.slideCount },
    (_, i) => `${base}/${String(i).padStart(2, "0")}.jpg`,
  );
}

export function getFreePptCoverUrl(template: FreePptTemplate): string {
  return `${templateBase(template.slug)}/00.jpg`;
}

export function getFreePptPptxUrl(template: FreePptTemplate): string {
  return `${templateBase(template.slug)}/${template.slug}.pptx`;
}

export function getFreePptCategories(
  templates: FreePptTemplate[],
): FreePptCategory[] {
  const byId = new Map<string, FreePptCategory>();
  for (const t of templates) {
    const existing = byId.get(t.category);
    if (existing) existing.count++;
    else byId.set(t.category, { id: t.category, name: t.categoryName, count: 1 });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Case-insensitive match on every whitespace-separated term. */
export function searchFreePptTemplates(
  templates: FreePptTemplate[],
  query: string,
  category?: string | null,
): FreePptTemplate[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return templates.filter((t) => {
    if (category && t.category !== category) return false;
    if (terms.length === 0) return true;
    const haystack = [t.title, t.description, t.categoryName, ...t.tags, ...t.colors]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * One slide per template page: the page preview is the slide background
 * (`layoutType: "background"`), with an empty editable paragraph on top so
 * users can type over it or switch the image to another layout.
 */
export function buildFreePptTemplateSlide(
  template: FreePptTemplate,
  pageIndex: number,
): Omit<PlateSlide, "id"> {
  const url = getFreePptPreviewUrls(template)[pageIndex];
  if (!url) {
    throw new RangeError(
      `${template.slug} has ${template.slideCount} slides; got index ${pageIndex}`,
    );
  }
  return {
    content: [{ type: "p", children: [{ text: "" }] }],
    layoutType: "background",
    alignment: "center",
    rootImage: {
      query: `${template.title} — slide ${pageIndex + 1}`,
      url,
      imageSource: "upload",
      layoutType: "background",
    },
  } as Omit<PlateSlide, "id">;
}

export function buildFreePptTemplateSlides(
  template: FreePptTemplate,
): Omit<PlateSlide, "id">[] {
  return Array.from({ length: template.slideCount }, (_, i) =>
    buildFreePptTemplateSlide(template, i),
  );
}
