"use client";

import type React from "react";
import { useEffect, useState, useRef } from "react";

import { Image, useMediaState } from "@platejs/media/react";
import { ResizableProvider } from "@platejs/resizable";
import {
  mediaResizeHandleVariants,
  Resizable,
  ResizeHandle,
} from "@/components/plate/ui/resize-handle";
import { type TImageElement } from "platejs";
import {
  PlateElement,
  useEditorRef,
  withHOC,
  withRef,
} from "platejs/react";
import { Spinner } from "@/components/ui/spinner";
import { usePresentationState } from "@/states/presentation-state";
import { PresentationImageEditor } from "./presentation-image-editor";
import { useDebouncedSave } from "@/hooks/presentation/useDebouncedSave";
import { useDraggable } from "../dnd/hooks/useDraggable";
import { generateImageAction } from "@/app/_actions/apps/image-studio/generate";
import { cn } from "@/lib/utils";

export interface PresentationImageElementProps {
  className?: string;
  children?: React.ReactNode;
  nodeProps?: Record<string, unknown>;
  element: TImageElement & {
    query?: string;
    setNodeValue?: unknown;
  };
}

export const PresentationImageElement = withHOC(
  ResizableProvider,
  withRef<any>(
    ({ children, className, nodeProps, ...props }: any, ref) => {
      const { align = "center", focused, readOnly, selected } = useMediaState();
      const { isDragging, handleRef } = useDraggable({
        element: props.element,
      });
      const imageRef = useRef<HTMLDivElement | null>(null);
      const editor = useEditorRef();
      const { saveImmediately } = useDebouncedSave();
      const [isSheetOpen, setIsSheetOpen] = useState(false);
      const [isGenerating, setIsGenerating] = useState(false);
      const [error, setError] = useState<string | undefined>(undefined);
      const [imageUrl, setImageUrl] = useState<string | undefined>(
        props.element.url
      );
      const { imageModel } = usePresentationState();
      const hasHandledGenerationRef = useRef(false);

      const generateImage = async (prompt: string) => {
        const container = document.querySelector(".presentation-slides");
        const isEditorReadOnly = !container?.contains(imageRef?.current);
        // Prevent image generation in read-only mode
        console.log(isEditorReadOnly, hasHandledGenerationRef.current);
        if (isEditorReadOnly) {
          return;
        }
        setIsGenerating(true);
        setError(undefined);
        try {
          hasHandledGenerationRef.current = true;
          const result = await generateImageAction(prompt, imageModel);
          if (
            result &&
            typeof result === "object" &&
            "success" in result &&
            result.success === true &&
            "image" in result &&
            result.image?.url
          ) {
            const newImageUrl = result.image.url;
            setImageUrl(newImageUrl);

            // Update the element's URL and query in the editor
            const path = editor.api.findPath(props.element);
            if (path) {
              editor.tf.setNodes(
                { url: newImageUrl, query: prompt } as Partial<TImageElement>,
                { at: path },
              );
            }

            // Force an immediate save to ensure the image URL is persisted
            setTimeout(() => {
              void saveImmediately();
            }, 500);
          }
        } catch (error) {
          console.error("Error generating image:", error);
          setError("Failed to generate image. Please try again.");
        } finally {
          setIsGenerating(false);
        }
      };

      // Generate image if query is provided but no URL exists
      useEffect(() => {
        // Skip if in read-only mode, we've already handled this element, or if there's no query or if URL already exists
        if (
          hasHandledGenerationRef.current ||
          !props.element.query ||
          props.element.url ||
          imageUrl
        ) {
          return;
        }

        // Use the same generateImage function we defined above
        if (props.element.query) {
          void generateImage(props.element.query);
        }
      }, [
        props.element.query,
        props.element.url,
        imageUrl,
        props.element.setNodeValue,
      ]);

      return (
        <>
          <PlateElement ref={ref} className={cn(className)} {...props}>
            <div ref={imageRef}>
              <Resizable
                align={align}
                options={{
                  align,
                  readOnly,
                }}
              >
                <ResizeHandle
                  className={mediaResizeHandleVariants({ direction: "left" })}
                  options={{ direction: "left" }}
                />
                {isGenerating ? (
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-muted">
                      <div className="flex flex-col items-center gap-2">
                        <Spinner className="h-6 w-6" />
                        <span className="text-sm text-muted-foreground">
                          Generating image...
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="presentation-image-container"
                    onDoubleClick={() => {
                      if (!readOnly) {
                        setIsSheetOpen(true);
                      }
                    }}
                  >
                    <Image
                      ref={handleRef}
                      className={cn(
                        "presentation-image",
                        "cursor-pointer",
                        focused &&
                          selected &&
                          "ring-2 ring-ring ring-offset-2",
                        isDragging && "opacity-50"
                      )}
                      alt={props.element.query ?? ""}
                      src={imageUrl}
                      onError={(e) => {
                        console.error(
                          "Presentation image failed to load:",
                          e,
                          imageUrl
                        );
                      }}
                      {...nodeProps}
                    />
                  </div>
                )}
                <ResizeHandle
                  className={mediaResizeHandleVariants({
                    direction: "right",
                  })}
                  options={{ direction: "right" }}
                />
                {children}
              </Resizable>
            </div>
          </PlateElement>

          {/* Image Editor Sheet */}
          <PresentationImageEditor
            open={isSheetOpen}
            onOpenChange={setIsSheetOpen}
            imageUrl={imageUrl}
            prompt={props.element.query}
            isGenerating={isGenerating}
            error={error}
            onRegenerateWithSamePrompt={() => {
              if (props.element.query) {
                void generateImage(props.element.query);
              }
            }}
            onGenerateWithNewPrompt={(newPrompt) => {
              void generateImage(newPrompt);
            }}
          />
        </>
      );
    }
  )
);
