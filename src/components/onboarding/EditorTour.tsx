"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GripVertical, Bot, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorTour } from "@/hooks/onboarding/useEditorTour";

type StepTarget = "sidebar" | "edit-panel" | "toolbar";

interface Step {
  target: StepTarget;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    target: "sidebar",
    icon: <GripVertical className="size-5" />,
    title: "Browse and reorder your slides",
    description: "Drag to rearrange your slides here.",
  },
  {
    target: "edit-panel",
    icon: <Bot className="size-5" />,
    title: "Edit and enhance your content",
    description: "Edit themes, add charts, insert images, or chat with the AI Agent.",
  },
  {
    target: "toolbar",
    icon: <Undo2 className="size-5" />,
    title: "Powerful controls at your fingertips",
    description: "Undo/redo, change theme, export to PPTX/PDF, or start presenting.",
  },
];

type ArrowPlacement = "top" | "bottom" | "left" | "right";

interface SlideOffset {
  x: number;
  y: number;
}

function getSlideOffset(placement: ArrowPlacement): SlideOffset {
  switch (placement) {
    case "top":
      return { x: 0, y: -8 };
    case "bottom":
      return { x: 0, y: 8 };
    case "left":
      return { x: 8, y: 0 };
    case "right":
      return { x: -8, y: 0 };
  }
}

type TooltipPosition = {
  top: number;
  left: number;
  arrowPlacement: ArrowPlacement;
};

function computeTooltipPosition(
  targetRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  preferredArrow: ArrowPlacement
): TooltipPosition {
  const gap = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top: number;
  let left: number;
  let arrowPlacement: ArrowPlacement;

  left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
  left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));

  if (preferredArrow === "right") {
    top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
    top = Math.max(16, Math.min(top, viewportHeight - tooltipHeight - 16));
    left = targetRect.left - tooltipWidth - gap;
    arrowPlacement = "right";
    if (left < 16) {
      left = targetRect.right + gap;
      arrowPlacement = "left";
    }
  } else if (preferredArrow === "left") {
    top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
    top = Math.max(16, Math.min(top, viewportHeight - tooltipHeight - 16));
    left = targetRect.right + gap;
    arrowPlacement = "left";
    if (left + tooltipWidth > viewportWidth - 16) {
      left = targetRect.left - tooltipWidth - gap;
      arrowPlacement = "right";
    }
  } else if (preferredArrow === "top") {
    top = targetRect.bottom + gap;
    arrowPlacement = "top";
    if (top + tooltipHeight > viewportHeight - 16) {
      top = targetRect.top - tooltipHeight - gap;
      arrowPlacement = "bottom";
    }
  } else {
    top = targetRect.top - tooltipHeight - gap;
    arrowPlacement = "bottom";
    if (top < 16) {
      top = targetRect.bottom + gap;
      arrowPlacement = "top";
    }
  }

  return { top, left, arrowPlacement };
}

interface EditorTourProps {
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  editPanelRef: React.RefObject<HTMLDivElement | null>;
}

export function EditorTour({ sidebarRef, editPanelRef }: EditorTourProps) {
  const { isVisible, currentStep, nextStep, dismiss } = useEditorTour();
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const measure = useCallback(() => {
    const step = steps[currentStep];
    if (!step) return;
    let el: HTMLElement | null = null;
    let preferredArrow: ArrowPlacement = "bottom";

    if (step.target === "sidebar") {
      el = sidebarRef.current;
      preferredArrow = "right";
    } else if (step.target === "edit-panel") {
      el = editPanelRef.current;
      preferredArrow = "left";
    } else if (step.target === "toolbar") {
      el = document.querySelector("header");
      preferredArrow = "bottom";
    }

    if (!el) return;

    const rect = el.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      if (step.target === "sidebar") {
        setPosition({
          top: window.innerHeight / 2 - 90,
          left: 16,
          arrowPlacement: "right",
        });
        return;
      }
      if (step.target === "edit-panel") {
        setPosition({
          top: window.innerHeight / 2 - 90,
          left: window.innerWidth - 340,
          arrowPlacement: "left",
        });
        return;
      }
      return;
    }

    setPosition(
      computeTooltipPosition(rect, 320, 180, preferredArrow)
    );
  }, [currentStep, sidebarRef, editPanelRef]);

  useEffect(() => {
    if (!isVisible) return;

    const raf = requestAnimationFrame(() => {
      measure();
    });

    const handleResize = () => measure();
    const handleScroll = () => measure();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isVisible, measure]);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, dismiss]);

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-tour-tooltip]")) {
        dismiss();
      }
    };

    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, dismiss]);

  if (!isVisible) return null;

  const step = steps[currentStep];
  if (!step) return null;
  const isLast = currentStep === steps.length - 1;
  const slideOffset = position
    ? getSlideOffset(position.arrowPlacement)
    : { x: 0, y: 0 };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[1px]"
        aria-hidden="true"
      />

      <AnimatePresence mode="wait">
        {position && (
          <motion.div
            key={currentStep}
            data-tour-tooltip
            initial={{ opacity: 0, x: slideOffset.x, y: slideOffset.y }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: slideOffset.x, y: slideOffset.y }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              zIndex: 9999,
              width: 320,
            }}
            className="rounded-xl border bg-background p-5 shadow-2xl"
            role="dialog"
            aria-label={`Editor tour step ${currentStep + 1}`}
          >
            <TourArrow placement={position.arrowPlacement} />

            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                {step.icon}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>

            <h3 className="mb-1 text-base font-semibold text-foreground">
              {step.title}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={dismiss}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Skip tour
              </button>
              <Button size="sm" onClick={isLast ? dismiss : nextStep}>
                {isLast ? "Got it" : "Next"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TourArrow({ placement }: { placement: ArrowPlacement }) {
  const borderColor = "hsl(var(--border))";
  const bgColor = "hsl(var(--background))";

  const outer: React.CSSProperties = {
    width: 0,
    height: 0,
    position: "absolute",
  };

  if (placement === "top") {
    return (
      <>
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
          style={{
            ...outer,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: `8px solid ${borderColor}`,
          }}
        />
        <div
          className="absolute left-1/2 top-0"
          style={{
            ...outer,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderBottom: `7px solid ${bgColor}`,
            transform: "translate(-50%, 1px)",
          }}
        />
      </>
    );
  }

  if (placement === "bottom") {
    return (
      <>
        <div
          className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2"
          style={{
            ...outer,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: `8px solid ${borderColor}`,
          }}
        />
        <div
          className="absolute left-1/2 bottom-0"
          style={{
            ...outer,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: `7px solid ${bgColor}`,
            transform: "translate(-50%, -1px)",
          }}
        />
      </>
    );
  }

  if (placement === "left") {
    return (
      <>
        <div
          className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2"
          style={{
            ...outer,
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderRight: `8px solid ${borderColor}`,
          }}
        />
        <div
          className="absolute top-1/2 left-0"
          style={{
            ...outer,
            borderTop: "7px solid transparent",
            borderBottom: "7px solid transparent",
            borderRight: `7px solid ${bgColor}`,
            transform: "translate(1px, -50%)",
          }}
        />
      </>
    );
  }

  return (
    <>
      <div
        className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2"
        style={{
          ...outer,
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          borderLeft: `8px solid ${borderColor}`,
        }}
      />
      <div
        className="absolute top-1/2 right-0"
        style={{
          ...outer,
          borderTop: "7px solid transparent",
          borderBottom: "7px solid transparent",
          borderLeft: `7px solid ${bgColor}`,
          transform: "translate(-1px, -50%)",
        }}
      />
    </>
  );
}
