"use server";

import { createCustomTheme } from "@/app/_actions/presentation/theme-actions";
import { auth } from "@clerk/nextjs/server";
import { type PlateSlide } from "@/components/notebook/presentation/utils/parser";
import {
  buildFreePptTemplateSlides,
  loadFreePptTemplates,
} from "@/lib/presentation/free-ppt-templates";
import { presentationThemeStyleDataSchema } from "@/lib/presentation/theme-schema";
import { type ThemeProperties } from "@/lib/presentation/themes";
import { createPresentation } from "./presentationActions";

/**
 * Create a presentation from a Free PPT Templates catalog entry: one
 * background-image slide per template page. `themeData` is the theme the
 * client extracted from the template's .pptx (extraction needs DOMParser, so
 * it runs in the browser); when valid it is saved as a custom theme.
 */
export async function createPresentationFromFreePptTemplate({
  slug,
  fallbackTheme = "mystique",
  language = "en-US",
  themeData,
}: {
  slug: string;
  fallbackTheme?: string;
  language?: string;
  themeData?: ThemeProperties | null;
}) {
  const { userId } = await auth();
  if (!userId) {
    return {
      success: false,
      message: "Please sign in to use templates",
      requiresSignIn: true,
    } as const;
  }

  const template = (await loadFreePptTemplates()).find((t) => t.slug === slug);
  if (!template) {
    return { success: false, message: "Template not found" } as const;
  }

  const slides: PlateSlide[] = buildFreePptTemplateSlides(template).map(
    (slide) => ({ ...slide, id: crypto.randomUUID() }) as PlateSlide,
  );

  let theme = fallbackTheme;
  let savedThemeData: ThemeProperties | null = null;
  const parsedTheme = themeData
    ? presentationThemeStyleDataSchema.safeParse({
        ...themeData,
        name: template.title.slice(0, 50),
      })
    : null;
  if (parsedTheme?.success) {
    const saved = await createCustomTheme({
      name: template.title.slice(0, 50),
      description: `Imported from the "${template.title}" template`.slice(0, 240),
      isPublic: false,
      themeData: parsedTheme.data,
    });
    if (saved.success && saved.themeId) {
      theme = saved.themeId;
      savedThemeData = parsedTheme.data as ThemeProperties;
    }
  }

  const result = await createPresentation({
    content: { slides },
    title: template.title,
    theme,
    language,
    editorMode: "flow",
    ...(savedThemeData ? { customization: { themeData: savedThemeData } } : {}),
  });

  return { ...result, theme, themeData: savedThemeData };
}
