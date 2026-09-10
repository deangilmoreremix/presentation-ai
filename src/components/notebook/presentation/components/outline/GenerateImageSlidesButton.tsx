import { type ImageModelList } from "@/constants/image-models";
import { useState } from "react";

const OpenAILogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#10a37f" />
    <path
      d="M12 6.5c-1.2 0-2.2 1-2.2 2.2 0 .4.1.7.3 1-.9.4-1.6 1.3-1.6 2.3 0 1.2 1 2.2 2.2 2.2.4 0 .7-.1 1 .3.4.9 1.3 1.6 2.3 1.6 1.2 0 2.2-1 2.2-2.2 0-.4-.1-.7-.3-1 .9-.4 1.6-1.3 1.6-2.3 0-1.2-1-2.2-2.2-2.2-.4 0-.7.1-1-.3-.4-.9-1.3-1.6-2.3-1.6Z"
      fill="#fff"
    />
  </svg>
);

const MODELS = [
  {
    id: "openai/gpt-image-2.5",
    name: "GPT Image 2.5",
    provider: "OpenAI",
    logo: <OpenAILogo />,
  },
  {
    id: "openai/gpt-image-2",
    name: "GPT Image 2",
    provider: "OpenAI",
    logo: <OpenAILogo />,
  },
];

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function GenerateImageSlidesButton({
  isGenerating,
  disabled = false,
  onGenerateImageSlides,
}: {
  isGenerating: boolean;
  disabled?: boolean;
  onGenerateImageSlides: (model: ImageModelList) => void;
}) {
  const [sel, setSel] = useState<(typeof MODELS)[0]>(
    MODELS[0] as (typeof MODELS)[0],
  );

  const handleGenerateClick = () => {
    if (!sel) return;
    onGenerateImageSlides(sel.id as ImageModelList);
  };

  return (
    <ButtonGroup className="w-full sm:w-fit">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            title="Change model"
            size="lg"
            className="flex shrink-0 items-center justify-center bg-background px-3 text-muted-foreground hover:bg-accent focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-10 sm:px-2.5"
          >
            {sel?.logo}
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-1 opacity-50 transition-transform group-data-[state=open]:rotate-180"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[220px] rounded-xl p-1">
          <DropdownMenuLabel className="px-2 pt-1 pb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Model
          </DropdownMenuLabel>
          {MODELS.map((m) => (
            <DropdownMenuItem
              key={m.id}
              onClick={() => setSel(m)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 ${
                sel?.id === m.id ? "bg-primary/10" : ""
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-foreground">
                    {m.name}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {m.provider}
                </div>
              </div>
              {sel?.id === m.id && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-[3px] text-primary"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="lg"
        onClick={handleGenerateClick}
        disabled={isGenerating || disabled}
        className={`flex flex-1 items-center justify-center gap-1.5 bg-background px-4 text-[15px] font-semibold hover:bg-accent focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-10 sm:flex-none sm:px-3 sm:text-sm ${
          isGenerating || disabled ? "opacity-70" : ""
        }`}
      >
        {isGenerating ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
            Generating...
          </>
        ) : (
          "Generate Image Slides"
        )}
      </Button>
    </ButtonGroup>
  );
}
