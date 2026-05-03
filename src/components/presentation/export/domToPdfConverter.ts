/**
 * DOM-based PDF Converter
 * Converts scanned slide DOM data to PDF using html-to-image and jsPDF
 */

import { type PlateSlide } from "@/components/notebook/presentation/utils/parser";
import { type ScanResult } from "./types";

interface JSPDFDocument {
  addPage: (format: [number, number], orientation: string) => void;
  addImage: (
    imageData: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
  getImageProperties: (dataUrl: string) => { width: number; height: number };
  output: (type: string) => ArrayBuffer;
}

const PPI = 96;
const POINTS_PER_INCH = 72;

const SLIDE_WIDTH_INCHES = 10;
const SLIDE_HEIGHT_INCHES = 5.625;

const SLIDE_WIDTH_PX = SLIDE_WIDTH_INCHES * PPI;
const SLIDE_HEIGHT_PX = SLIDE_HEIGHT_INCHES * PPI;

/**
 * Convert scanned slides to PDF
 */
export async function convertToPdf(
  scanResults: ScanResult[],
  slides: PlateSlide[],
): Promise<ArrayBuffer> {
  const { jsPDF } = (await import("jspdf")) as {
    jsPDF: new (options: {
      orientation: string;
      unit: string;
      format: [number, number];
    }) => JSPDFDocument;
  };

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: [SLIDE_WIDTH_INCHES, SLIDE_HEIGHT_INCHES],
  });

  for (let i = 0; i < scanResults.length; i++) {
    const scanResult = scanResults[i];
    const slideData = slides[i];

    if (!scanResult || !slideData) continue;

    if (i > 0) {
      pdf.addPage([SLIDE_WIDTH_INCHES, SLIDE_HEIGHT_INCHES], "landscape");
    }

    await addSlideToPdf(pdf, scanResult, slideData);
  }

  return pdf.output("arraybuffer") as ArrayBuffer;
}

/**
 * Add a single slide to the PDF
 */
async function addSlideToPdf(
  pdf: JSPDFDocument,
  scanResult: ScanResult,
  slideData: PlateSlide,
): Promise<void> {
  if (slideData.isImageSlide && slideData.rootImage?.url) {
    const imageUrl = slideData.rootImage.url.startsWith("data:")
      ? slideData.rootImage.url
      : slideData.rootImage.url;

    try {
      const imgProps = pdf.getImageProperties(imageUrl);
      const pdfWidth = SLIDE_WIDTH_INCHES;
      const pdfHeight = SLIDE_HEIGHT_INCHES;

      const imgRatio = imgProps.width / imgProps.height;
      const slideRatio = pdfWidth / pdfHeight;

      let w = pdfWidth;
      let h = pdfHeight;

      if (imgRatio > slideRatio) {
        h = pdfWidth / imgRatio;
      } else {
        w = pdfHeight * imgRatio;
      }

      const x = (pdfWidth - w) / 2;
      const y = (pdfHeight - h) / 2;

      pdf.addImage(imageUrl, "JPEG", x, y, w, h);
    } catch (error) {
      console.warn("Failed to add image slide to PDF:", error);
    }
    return;
  }

  const canvas = await renderSlideToCanvas(scanResult);
  if (!canvas) return;

  const imageData = canvas.toDataURL("image/jpeg", 0.95);
  pdf.addImage(
    imageData,
    "JPEG",
    0,
    0,
    SLIDE_WIDTH_INCHES,
    SLIDE_HEIGHT_INCHES,
  );
}

/**
 * Render a slide to canvas using html-to-image
 */
async function renderSlideToCanvas(
  scanResult: ScanResult,
): Promise<HTMLCanvasElement | null> {
  const { toCanvas } = await import("html-to-image");

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = `${SLIDE_WIDTH_PX}px`;
  container.style.height = `${SLIDE_HEIGHT_PX}px`;
  container.style.backgroundColor =
    scanResult.styles.backgroundColor || "#ffffff";

  document.body.appendChild(container);

  try {
    const canvas = await toCanvas(container, {
      width: SLIDE_WIDTH_PX,
      height: SLIDE_HEIGHT_PX,
      pixelRatio: PPI / 96,
      quality: 0.95,
    });
    return canvas;
  } catch (error) {
    console.warn("Failed to render slide to canvas:", error);
    return null;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Export function for client-side use
 * Returns the blob and fileName for manual download handling
 */
export async function exportPresentationToPdf(
  scanResults: ScanResult[],
  slides: PlateSlide[],
  fileName: string = "presentation",
): Promise<{ blob: Blob; fileName: string }> {
  const arrayBuffer = await convertToPdf(scanResults, slides);

  const blob = new Blob([arrayBuffer], {
    type: "application/pdf",
  });

  return { blob, fileName: `${fileName}.pdf` };
}

/**
 * Helper to trigger download of a blob
 */
export function downloadPdfBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
