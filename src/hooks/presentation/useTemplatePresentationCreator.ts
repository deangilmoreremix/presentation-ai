import {
  createPresentationFromTemplate,
} from "@/app/_actions/notebook/presentation/presentationActions";
import { usePresentationState } from "@/states/presentation-state";
import { useAppTheme } from "@/provider/theme-provider";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { type PlateSlide } from "@/components/notebook/presentation/utils/parser";
import { type TemplateDefinition } from "@/components/notebook/presentation/utils/templates";

export function useTemplatePresentationCreator() {
  const router = useRouter();
  const { resolvedTheme } = useAppTheme();
  const [isCreating, setIsCreating] = useState(false);
  const { language, setCurrentPresentation, setTheme } = usePresentationState();

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
    ],
  );

  return {
    createFromTemplate,
    isCreating,
  };
}
