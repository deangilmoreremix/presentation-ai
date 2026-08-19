"use client";

import { Bot, Palette, Paintbrush } from "lucide-react";
import * as motion from "motion/react-client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Import our new components
import { updatePresentationTitle } from "@/app/_actions/notebook/presentation/presentationActions";
import SmartPresentationsLogo from "@/components/globals/smart-presentations-logo";
import { ExportButton } from "@/components/presentation/buttons/ExportButton";
import { HistoryButtons } from "@/components/presentation/buttons/HistoryButtons";
import { PresentButton } from "@/components/presentation/buttons/PresentButton";
import { ShareButton } from "@/components/presentation/buttons/ShareButton";
import { SaveStatus } from "@/components/presentation/buttons/SaveStatus";
import { PresentationMenu } from "@/components/presentation/controls/PresentationMenu";
import { PresentationSavingIndicator } from "@/components/presentation/core/PresentationSavingIndicator";
import { Button } from "@/components/ui/button";
import { Brain } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import { usePresentationState } from "@/states/presentation-state";

interface PresentationHeaderProps {
  title?: string;
}

export default function PresentationHeader({ title }: PresentationHeaderProps) {
  const currentPresentationTitle = usePresentationState(
    (s) => s.currentPresentationTitle,
  );
  const isPresenting = usePresentationState((s) => s.isPresenting);
  const currentPresentationId = usePresentationState(
    (s) => s.currentPresentationId,
  );
  const isReadOnly = usePresentationState((s) => s.isReadOnly);
  const activeRightPanel = usePresentationState((s) => s.activeRightPanel);
  const setActiveRightPanel = usePresentationState(
    (s) => s.setActiveRightPanel,
  );

  const { user, isLoaded } = useUser();

  const [presentationTitle, setPresentationTitle] = useState<string>(
    "Presentation",
  );
  const pathname = usePathname();

  const isPresentationPage =
    (pathname.startsWith("/presentation/") ||
      pathname.startsWith("/share/presentation/")) &&
    !pathname.includes("generate");
  const showPresentationTitle = pathname !== "/presentation";

  const searchParams = useSearchParams();
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  useEffect(() => {
    if (searchParams.has("export")) {
      setIsExportDialogOpen(true);
    }
  }, [searchParams]);

  const isLoggedOut = isLoaded && !user;
  const showBrand = isLoggedOut;

  // Update title when it changes in the state
  useEffect(() => {
    if (currentPresentationTitle) {
      setPresentationTitle(currentPresentationTitle);
    } else if (title) {
      setPresentationTitle(title);
    }
  }, [currentPresentationTitle, title]);

  if (pathname === "/presentation/create")
    return (
      <header
        className="notranslate flex min-h-12 w-full max-w-screen-xl items-center justify-between gap-2 overflow-clip border-accent px-2 py-2"
        translate="no"
      >
        <div className="flex min-w-0 items-center gap-2">
          {/* This component is suppose to be logo but for now its is actually hamburger menu */}

          <Link href="/presentation">
            <Button size={"icon"} className="rounded-full" variant={"ghost"}>
              <Brain></Brain>
            </Button>
          </Link>

          <motion.div
            initial={false}
            layout="position"
            transition={{ duration: 1 }}
          >
            <Link href="/" className="h-max">
              <SmartPresentationsLogo className="h-10 w-30 cursor-pointer transition-transform duration-100 active:scale-95"></SmartPresentationsLogo>
            </Link>
          </motion.div>
        </div>

        {/* <SideBarDropdown /> */}
      </header>
    );

  return (
    <header
      className="notranslate flex min-h-12 w-full items-center justify-between gap-3 overflow-hidden border-b border-accent bg-background px-3 py-2 sm:px-4"
      translate="no"
    >
      {/* Left section with breadcrumb navigation */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showBrand ? (
          <Link href="/">
            <SmartPresentationsLogo className="h-8 w-28" />
          </Link>
        ) : (
          <Link
            href="/presentation"
            className="text-muted-foreground hover:text-foreground"
          >
            <Brain className="h-5 w-5"></Brain>
          </Link>
        )}
        {isPresentationPage && !isLoggedOut && (
          <PresentationMenu readOnly={isReadOnly} />
        )}
        {isLoggedOut && showPresentationTitle ? (
          <span className="truncate text-sm font-medium text-foreground sm:hidden">
            {presentationTitle}
          </span>
        ) : !isLoggedOut && showPresentationTitle ? (
          <Input
            type="text"
            id="presentation-title-input"
            value={presentationTitle}
            onChange={(e) => setPresentationTitle(e.target.value)}
            disabled={isReadOnly}
            onBlur={async () => {
              if (isReadOnly) {
                return;
              }
              if (
                presentationTitle &&
                currentPresentationTitle !== presentationTitle &&
                currentPresentationId
              ) {
                try {
                  await updatePresentationTitle(
                    currentPresentationId,
                    presentationTitle,
                  );
                } catch {
                  setPresentationTitle(currentPresentationTitle || "");
                }
              }
            }}
            className="line-clamp-1 h-auto min-w-0 flex-1 cursor-text rounded-xs border-none bg-transparent p-0 font-medium text-ellipsis shadow-none outline-none sm:max-w-96"
            style={{
              appearance: "none",
            }}
          />
        ) : null}
      </div>

      {isLoggedOut && showPresentationTitle ? (
        <div className="pointer-events-none absolute top-1/2 left-1/2 w-[min(60vw,40rem)] -translate-x-1/2 -translate-y-1/2 px-3 text-center">
          <span className="line-clamp-1 text-lg font-medium text-foreground">
            {presentationTitle}
          </span>
        </div>
      ) : null}

      {/* Right section with actions */}
      <div className="scrollbar-hide flex max-w-[56vw] shrink-0 items-center gap-2 overflow-x-auto md:max-w-none md:overflow-visible">
        {/* Saving indicator - Placed right before Theme button */}
        {isPresentationPage && !isPresenting && !isReadOnly && (
          <PresentationSavingIndicator />
        )}

        {/* Undo/Redo - Visible in main toolbar */}
        {isPresentationPage && !isPresenting && !isReadOnly && <HistoryButtons />}

        {/* Theme button - Only in presentation page, not outline or present mode */}
        {isPresentationPage && !isPresenting && !isReadOnly && (
          <Button
            variant="ghost"
            className="h-9 gap-1.5"
            onClick={() => setActiveRightPanel("theme")}
          >
            <Palette className="size-4" />
            <span className="sr-only">
              Theme
            </span>
            <span className="hidden sm:inline">
              Theme
            </span>
          </Button>
        )}

        {/* Customize Theme button - Only in presentation page, not outline or present mode */}
        {isPresentationPage && !isPresenting && !isReadOnly && (
          <Button
            variant="ghost"
            className="h-9 gap-1.5"
            onClick={() => {
              usePresentationState.getState().setIsThemeCreatorOpen(true);
            }}
          >
            <Paintbrush className="size-4" />
            <span className="sr-only">
              Customize Theme
            </span>
            <span className="hidden sm:inline">
              Customize Theme
            </span>
          </Button>
        )}

        {/* Export button - Only in presentation page, not outline or present mode */}
        {isPresentationPage && (
          <ExportButton
            open={isExportDialogOpen}
            onOpenChange={setIsExportDialogOpen}
          />
        )}

        {/* Save status - Only in presentation page, not outline or present mode */}
        {isPresentationPage && !isPresenting && !isReadOnly && <SaveStatus />}

        {/* Share button - Only in presentation page, not outline */}
        {isPresentationPage && <ShareButton />}

        {/* Agent button - Only in presentation page, not outline or present mode */}
        {isPresentationPage && !isPresenting && !isReadOnly && (
          <Button
            variant={activeRightPanel === "agent" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveRightPanel(activeRightPanel === "agent" ? null : "agent");
            }}
            className="gap-2"
          >
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Agent</span>
          </Button>
        )}

        {/* Present button - Only in presentation page, not outline */}
        {isPresentationPage && <PresentButton />}

      </div>
    </header>
  );
}
