import { createPresentationFromFreePptTemplate } from "@/app/_actions/notebook/presentation/freePptTemplateActions";
import {
  createPresentationFromTemplate,
} from "@/app/_actions/notebook/presentation/presentationActions";
import { type FreePptTemplate } from "@/lib/presentation/free-ppt-templates";
import { type ThemeProperties } from "@/lib/presentation/themes";

/** Best effort: pull colors/fonts from the template's .pptx in the browser. */
async function extractFreePptTheme(
  template: FreePptTemplate,
): Promise<ThemeProperties | null> {
  try {
    const res = await fetch(
      `/api/templates/free-ppt/${encodeURIComponent(template.slug)}/pptx`,
    );
    if (!res.ok) return null;
    const file = new File([await res.blob()], `${template.slug}.pptx`);
    const { extractThemeFromPptx } = await import(
      "@/lib/presentation/pptx-theme-extractor"
    );
    return await extractThemeFromPptx(file);
  } catch (error) {
    console.warn("Theme extraction failed; using default theme", error);
    return null;
  }
}
import { usePresentationState } from "@/states/presentation-state";
import { useAppTheme } from "@/provider/theme-provider";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { type PlateSlide } from "@/components/notebook/presentation/utils/parser";
import { type TemplateDefinition } from "@/components/notebook/presentation/utils/templates";

export function useTemplatePresentationCreator() {
  const router = useRouter();
  const { resolvedTheme } = useAppTheme();
  const [isCreating, setIsCreating] = useState(false);
  const { isSignedIn } = useAuth();
  const { language, setCurrentPresentation, setTheme, setEditorMode } = usePresentationState();

  const createFromTemplate = useCallback(
    async (template: TemplateDefinition) => {
      if (isCreating) return;

      setIsCreating(true);
      try {
        const theme = resolvedTheme === "dark" ? "ebony" : "mystique";

        const result = await createPresentationFromTemplate({
          template: template.template,
          title: `${template.name} Presentation`,
          theme,
          language,
        });

        if (result.success && result.presentation) {
          setTheme(theme);
          setEditorMode("flow");
          setCurrentPresentation(
            result.presentation.id,
            result.presentation.title,
          );
          router.push(`/presentation/${result.presentation.id}`);
        } else {
          toast.error(result.message || "Failed to create presentation");
        }
      } catch (error) {
        console.error("Error creating presentation from template:", error);
        toast.error("Failed to create presentation");
      } finally {
        setIsCreating(false);
      }
    },
    [
      isCreating,
      language,
      resolvedTheme,
      router,
      setCurrentPresentation,
      setTheme,
      setEditorMode,
    ],
  );

  const createFromFreePptTemplate = useCallback(
    async (template: FreePptTemplate) => {
      if (isCreating) return;

      setIsCreating(true);
      const toastId = toast.loading(`Importing "${template.title}"…`);
      try {
        const themeData = isSignedIn ? await extractFreePptTheme(template) : null;
        const result = await createPresentationFromFreePptTemplate({
          slug: template.slug,
          fallbackTheme: resolvedTheme === "dark" ? "ebony" : "mystique",
          language,
          themeData,
        });

        if (result.success && result.presentation) {
          setTheme(result.theme, result.themeData);
          setEditorMode("flow");
          setCurrentPresentation(
            result.presentation.id,
            result.presentation.title,
          );
          toast.success("Template ready", { id: toastId });
          router.push(`/presentation/${result.presentation.id}`);
        } else if ("requiresSignIn" in result && result.requiresSignIn) {
          toast.info(result.message, { id: toastId });
          router.push(`/auth/signin?redirect=${encodeURIComponent("/templates")}`);
        } else {
          toast.error(result.message || "Failed to create presentation", {
            id: toastId,
          });
        }
      } catch (error) {
        console.error("Error creating presentation from free template:", error);
        toast.error("Failed to create presentation", { id: toastId });
      } finally {
        setIsCreating(false);
      }
    },
    [
      isCreating,
      isSignedIn,
      language,
      resolvedTheme,
      router,
      setCurrentPresentation,
      setTheme,
      setEditorMode,
    ],
  );

  return {
    createFromTemplate,
    createFromFreePptTemplate,
    isCreating,
  };
}
