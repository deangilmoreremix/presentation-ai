import { describe, expect, it } from "vitest";

import {
  buildFreePptTemplateSlide,
  buildFreePptTemplateSlides,
  getFreePptCategories,
  getFreePptCoverUrl,
  getFreePptPptxUrl,
  getFreePptPreviewUrls,
  loadFreePptTemplates,
  searchFreePptTemplates,
} from "@/lib/presentation/free-ppt-templates";

describe("free-ppt-templates catalog", () => {
  it("bundles the full catalog with unique slugs", async () => {
    const templates = await loadFreePptTemplates();
    expect(templates.length).toBe(595);
    expect(new Set(templates.map((t) => t.slug)).size).toBe(templates.length);
    for (const t of templates) {
      expect(t.slideCount).toBeGreaterThan(0);
      expect(t.title).toBeTruthy();
    }
  });

  it("derives CDN urls from the slug", async () => {
    const [t] = await loadFreePptTemplates();
    const base = `https://cdn.ppttemplate.ai/templates/${t!.slug}/v3`;
    expect(getFreePptCoverUrl(t!)).toBe(`${base}/00.jpg`);
    expect(getFreePptPptxUrl(t!)).toBe(`${base}/${t!.slug}.pptx`);
    const previews = getFreePptPreviewUrls(t!);
    expect(previews).toHaveLength(t!.slideCount);
    expect(previews.at(-1)).toBe(
      `${base}/${String(t!.slideCount - 1).padStart(2, "0")}.jpg`,
    );
  });

  it("groups categories with counts that sum to the total", async () => {
    const templates = await loadFreePptTemplates();
    const categories = getFreePptCategories(templates);
    expect(categories.length).toBe(19);
    expect(categories.reduce((n, c) => n + c.count, 0)).toBe(templates.length);
  });

  it("searches across title, tags and category with every term", async () => {
    const templates = await loadFreePptTemplates();
    const pitch = searchFreePptTemplates(templates, "pitch", "pitch-deck");
    expect(pitch.length).toBeGreaterThan(0);
    expect(pitch.every((t) => t.category === "pitch-deck")).toBe(true);
    expect(searchFreePptTemplates(templates, "zzzz-no-match")).toHaveLength(0);
    expect(searchFreePptTemplates(templates, "")).toHaveLength(templates.length);
  });
});

describe("free-ppt-templates slides", () => {
  it("builds one background-image slide per template page", async () => {
    const [t] = await loadFreePptTemplates();
    const slides = buildFreePptTemplateSlides(t!);
    expect(slides).toHaveLength(t!.slideCount);
    const previews = getFreePptPreviewUrls(t!);
    slides.forEach((slide, i) => {
      expect(slide.layoutType).toBe("background");
      expect(slide.rootImage?.url).toBe(previews[i]);
      expect(slide.content.length).toBeGreaterThan(0);
    });
  });

  it("rejects out-of-range pages", async () => {
    const [t] = await loadFreePptTemplates();
    expect(() => buildFreePptTemplateSlide(t!, t!.slideCount)).toThrow(RangeError);
  });
});
