"use client";

import { nanoid } from "nanoid";

import { type PlateSlide } from "@/components/notebook/presentation/utils/parser";
import { getSlideAspectRatioForGenerationAspectRatio } from "@/lib/presentation/aspect-ratio";
import { usePresentationState } from "@/states/presentation-state";

export type InsertPosition = "before" | "after";

export function useSlideOperations() {
  const setSlides = usePresentationState((s) => s.setSlides);
  const setCurrentSlideId = usePresentationState((s) => s.setCurrentSlideId);
  const buildSlide = (slide?: PlateSlide): PlateSlide => {
    if (slide) {
      return slide;
    }

    const { generationAspectRatio } = usePresentationState.getState();

    return {
      content: [
        {
          type: "h1",
          children: [{ text: "" }],
        },
      ],
      id: nanoid(),
      alignment: "center",
      formatCategory: "presentation",
      aspectRatio: getSlideAspectRatioForGenerationAspectRatio(
        generationAspectRatio,
      ),
    };
  };

  const addSlide = (
    position: InsertPosition,
    id: string,
    slide?: PlateSlide,
  ) => {
    const newSlide = buildSlide(slide);
    const { slides } = usePresentationState.getState();
    const updatedSlides = [...slides];
    const index = slides.findIndex((slide) => slide.id === id);
    const insertIndex = position === "before" ? index : index + 1;
    updatedSlides.splice(insertIndex, 0, newSlide);
    setSlides(updatedSlides);
    setCurrentSlideId(newSlide.id);
  };

  const addFirstSlide = (slide?: PlateSlide) => {
    const newSlide = buildSlide(slide);
    const { slides } = usePresentationState.getState();

    if (slides.length === 0) {
      setSlides([newSlide]);
      setCurrentSlideId(newSlide.id);
      return;
    }

    const updatedSlides = [...slides, newSlide];
    setSlides(updatedSlides);
    setCurrentSlideId(newSlide.id);
  };

  const deleteSlide = (id: string) => {
    const { slides } = usePresentationState.getState();
    const updatedSlides = [...slides];
    const index = updatedSlides.findIndex((slide) => slide.id === id);
    updatedSlides.splice(index, 1);
    setSlides(updatedSlides);
  };

  const deleteSelectedSlides = (ids: string[]) => {
    const { slides } = usePresentationState.getState();
    const idSet = new Set(ids);
    const updatedSlides = slides.filter((slide) => !idSet.has(slide.id));
    setSlides(updatedSlides);
  };

  const duplicateSelectedSlides = (ids: string[]) => {
    const { slides } = usePresentationState.getState();
    const idSet = new Set(ids);
    const indexMap = new Map<number, string>();
    slides.forEach((slide, i) => {
      if (idSet.has(slide.id)) {
        indexMap.set(i, slide.id);
      }
    });
    if (indexMap.size === 0) return;
    const updatedSlides = [...slides];
    let offset = 0;
    const sortedIndices = Array.from(indexMap.keys()).sort((a, b) => a - b);
    for (const idx of sortedIndices) {
      const slide = updatedSlides[idx + offset];
      if (!slide) continue;
      const newSlide = buildSlide(slide);
      updatedSlides.splice(idx + offset + 1, 0, newSlide);
      offset += 1;
    }
    setSlides(updatedSlides);
  };

  const moveSelectedSlidesTo = (ids: string[], targetIndex: number) => {
    const { slides } = usePresentationState.getState();
    const idSet = new Set(ids);
    const selectedSlides = slides.filter((slide) => idSet.has(slide.id));
    const remainingSlides = slides.filter((slide) => !idSet.has(slide.id));
    const clampedTarget = Math.max(
      0,
      Math.min(targetIndex, remainingSlides.length),
    );
    const updatedSlides = [
      ...remainingSlides.slice(0, clampedTarget),
      ...selectedSlides,
      ...remainingSlides.slice(clampedTarget),
    ];
    setSlides(updatedSlides);
  };

  const moveSlide = (id: string, direction: "up" | "down") => {
    const { slides } = usePresentationState.getState();
    const index = slides.findIndex((slide) => slide.id === id);
    if (index < 0) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;
    const updatedSlides = [...slides];
    const moved = updatedSlides.splice(index, 1)[0];
    if (!moved) return;
    updatedSlides.splice(newIndex, 0, moved);
    setSlides(updatedSlides);
  };

  return {
    addSlide,
    addFirstSlide,
    deleteSlide,
    deleteSelectedSlides,
    duplicateSelectedSlides,
    moveSelectedSlidesTo,
    moveSlide,
  };
}
