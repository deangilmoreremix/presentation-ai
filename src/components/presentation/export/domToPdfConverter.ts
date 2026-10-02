/**
 * DOM-based PDF Converter
 * Converts scanned slide DOM data to PDF using html-to-image and jsPDF
 */

import { type PlateSlide } from "@/components/notebook/presentation/utils/parser";
import {
  resolveExportImageDataUrl,
  type ExportImageProxyInput,
} from "@/lib/image-proxy";
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
 * jsPDF can only embed PNG and JPEG. Everything else (GIF, WebP, SVG — all of
 * which the image proxy happily forwards because it allows `image/*`) has to be
 * rasterized first.
 */
const PDF_EMBEDDABLE_FORMATS: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/jpg": "JPEG",
  "image/png": "PNG",
};

type PdfImage = {
  dataUrl: string;
  format: string;
};

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to decode image."));
    image.src = dataUrl;
  });
}

/**
 * Turn an arbitrary image into something jsPDF can embed.
 *
 * The bytes always arrive as a data URL from `resolveExportImageDataUrl`, so
 * jsPDF never has to fetch anything itself — it has no fetch path at all, which
 * is exactly why remote images had to be dropped from PDF exports before the
 * proxy existed.
 */
async function toPdfImage(dataUrl: string): Promise<PdfImage | null> {
  const separator = dataUrl.indexOf(";");
  const mimeType = (
    separator === -1 ? dataUrl.slice(5) : dataUrl.slice(5, separator)
  ).toLowerCase();
  const format = PDF_EMBEDDABLE_FORMATS[mimeType];
  if (format) {
    return { dataUrl, format };
  }

  try {
    const image = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");
    if (!context || canvas.width === 0 || canvas.height === 0) {
      return null;
    }

    context.drawImage(image, 0, 0);
    return { dataUrl: canvas.toDataURL("image/png"), format: "PNG" };
  } catch (error) {
    console.warn("Failed to rasterize image for PDF:", error);
    return null;
  }
}

/**
 * Resolve a scanned image URL to an embeddable PDF image, or `null` when the
 * image cannot be read (in which case the slide renders without it rather than
 * failing the whole export).
 */
async function resolvePdfImage(
  url: string,
  input?: ExportImageProxyInput,
): Promise<PdfImage | null> {
  if (!url) return null;

  try {
    const dataUrl = await resolveExportImageDataUrl(url, input ?? {});
    if (!dataUrl) return null;
    return await toPdfImage(dataUrl);
  } catch (error) {
    console.warn("Failed to resolve image for PDF:", error);
    return null;
  }
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
    const image = await resolvePdfImage(
      slideData.rootImage.url,
      slideData.rootImage,
    );

    if (image) {
      try {
        const imgProps = pdf.getImageProperties(image.dataUrl);
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

        pdf.addImage(image.dataUrl, image.format, x, y, w, h);
      } catch (error) {
        console.warn("Failed to add image slide to PDF:", error);
      }
    }
    return;
  }

  // Layout "background" slides carry a full-bleed image. It is resolved through
  // the image proxy and handed to html-to-image as a data URL so the rasterized
  // canvas never touches a cross-origin URL.
  const backgroundImage = scanResult.backgroundImageUrl
    ? await resolvePdfImage(scanResult.backgroundImageUrl)
    : null;

  const canvas = await renderSlideToCanvas(scanResult, backgroundImage);
  if (canvas) {
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

  // Non-image slides still carry a scanned root image (a picture placed next to
  // text, a chart, an infographic, ...). It was dropped entirely before; draw it
  // on top of the rendered page at its scanned position.
  if (scanResult.rootImage?.url) {
    const source = scanResult.rootImage.originalUrl ?? scanResult.rootImage.url;
    const image = await resolvePdfImage(source, scanResult.rootImage);
    if (image) {
      const position = scanResult.rootImage.position;
      const x = (position.x / 100) * SLIDE_WIDTH_INCHES;
      const y = (position.y / 100) * SLIDE_HEIGHT_INCHES;
      const w = (position.width / 100) * SLIDE_WIDTH_INCHES;
      const h = (position.height / 100) * SLIDE_HEIGHT_INCHES;

      try {
        pdf.addImage(image.dataUrl, image.format, x, y, w, h);
      } catch (error) {
        console.warn("Failed to add root image to PDF:", error);
      }
    }
  }
}

/**
 * Render a slide to canvas using html-to-image
 */
async function renderSlideToCanvas(
  scanResult: ScanResult,
  backgroundImage: PdfImage | null,
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

  if (backgroundImage) {
    container.style.backgroundImage = `url("${backgroundImage.dataUrl}")`;
    container.style.backgroundSize = "cover";
    container.style.backgroundPosition = "center";
    container.style.backgroundRepeat = "no-repeat";
  }

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
