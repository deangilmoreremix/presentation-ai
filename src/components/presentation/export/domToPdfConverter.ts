/**
 * DOM-based PDF Converter
 *
 * Each slide is exported by rasterizing the slide's *live* DOM and stamping the
 * result onto a 16:9 PDF page, plus an invisible text layer on top so the text
 * stays selectable and searchable (see `./pdfTextLayer`).
 *
 * The raster is produced by `html-to-image` from an off-screen capture host that
 * holds a clone of the real slide element — the same element `domSlideScanner`
 * measured to build the `ScanResult`. Rasterizing a hand-built approximation of
 * the slide (which is what this file used to do: an empty container carrying
 * nothing but a background colour and the root image) cannot reproduce text,
 * tables or shapes, so the clone is the whole point of the renderer.
 */

import { type PlateSlide } from "@/components/notebook/presentation/utils/parser";
import {
  resolveExportImageDataUrl,
  type ExportImageProxyInput,
} from "@/lib/image-proxy";
import {
  buildInvisibleTextLayer,
  type InvisibleTextRun,
} from "./pdfTextLayer";
import { type ScanResult } from "./types";
import { getOptimalPixelRatio } from "./utils";

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
  deletePage: (pageNumber: number) => void;
  getImageProperties: (dataUrl: string) => { width: number; height: number };
  getNumberOfPages: () => number;
  output: (type: string) => ArrayBuffer;
  setFont: (fontName: string, fontStyle?: string) => void;
  setFontSize: (size: number) => void;
  text: (
    text: string | string[],
    x: number,
    y: number,
    options: {
      align?: "left" | "center" | "right" | "justify";
      baseline?: "alphabetic" | "top" | "middle" | "bottom";
      renderingMode?: "fill" | "stroke" | "fillThenStroke" | "invisible";
      lineHeightFactor?: number;
    },
  ) => void;
}

const PPI = 96;

const SLIDE_WIDTH_INCHES = 10;
const SLIDE_HEIGHT_INCHES = 5.625;

const SLIDE_WIDTH_PX = SLIDE_WIDTH_INCHES * PPI;
const SLIDE_HEIGHT_PX = SLIDE_HEIGHT_INCHES * PPI;

/**
 * Rasters wider than this are pointless: the PDF page is 10in wide, so beyond
 * ~1600px there is no visible gain and the JPEG payload grows for nothing.
 */
const TARGET_CAPTURE_WIDTH_PX = 1600;

/**
 * `html-to-image` fetches every resource it cannot inline and, on failure,
 * substitutes `imagePlaceholder` — which defaults to the empty string. An
 * `<img src="">` fires neither `load` nor `error`, so the capture would hang
 * forever instead of skipping the broken image. Handing it a real 1x1 GIF keeps
 * the failure path terminating.
 */
const TRANSPARENT_PIXEL_DATA_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * `html-to-image` reads the slide's computed `background-image` and
 * `mask-image` from the clone's inline style and re-fetches them itself, which
 * depends on the upstream host sending CORS headers. Pre-resolving them to data
 * URLs is what keeps the capture canvas untainted.
 */
const URL_TOKEN = /url\((['"]?)([^'")]+)\1\)/g;

/**
 * Per-export caches. A deck routinely reuses the same logo on every slide and
 * the theme font set is usually identical across slides, so both are resolved
 * once and reused. They are created per `convertToPdf` call (not module-level)
 * so a later export never serves bytes from an earlier document state.
 */
type ExportCaches = {
  imageDataUrls: Map<string, Promise<string | null>>;
  pdfImages: Map<string, Promise<PdfImage | null>>;
  fontCss: Map<string, Promise<string | null>>;
};

function createExportCaches(): ExportCaches {
  return {
    imageDataUrls: new Map(),
    pdfImages: new Map(),
    fontCss: new Map(),
  };
}

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

  const caches = createExportCaches();

  let rendered = 0;

  for (const scanResult of scanResults) {
    if (!scanResult) continue;

    // `scanAllSlides` skips slides it could not find in the DOM, so a scan
    // result is *not* guaranteed to sit at the same index as its slide. Pair
    // them by id, the way the PPTX converter does.
    const slideData = slides.find(
      (slide) => slide.id === scanResult.slideId,
    );
    if (!slideData) continue;

    // The page for this slide is opened speculatively: whether the slide has
    // anything to show is only known once it has been drawn, and a slide that
    // draws nothing must not leave a blank page behind. Page 1 is never given
    // back — a PDF without pages cannot be opened at all.
    let speculativePage = 0;
    let drawn = false;

    try {
      if (rendered > 0) {
        pdf.addPage([SLIDE_WIDTH_INCHES, SLIDE_HEIGHT_INCHES], "landscape");
        speculativePage = pdf.getNumberOfPages();
      }
      drawn = await addSlideToPdf(pdf, scanResult, slideData, caches);
      if (drawn) rendered++;
    } catch (error) {
      // One unreadable slide must not abort the whole export. The page is given
      // back below and the deck still downloads.
      console.warn(
        `Skipping slide ${scanResult.slideId} during PDF export:`,
        error,
      );
    } finally {
      if (speculativePage > 0 && !drawn) {
        pdf.deletePage(speculativePage);
      }
    }
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
 * The proxy decision depends on image provenance, so the provenance is part of
 * the cache key.
 */
function imageCacheKey(url: string, input?: ExportImageProxyInput): string {
  if (!input) return url;
  return [
    url,
    input.embedType ?? "",
    input.imageSource ?? "",
    input.stockImageProvider ?? "",
  ].join("|");
}

/**
 * Resolve a URL to an inline data URL, memoized for the current export.
 *
 * Every image that reaches a canvas goes through here: the rasterized slide and
 * the images `jsPDF` embeds. A data URL cannot taint a canvas and cannot be
 * re-fetched, which is the only reason cross-origin artwork is safe at all.
 */
function resolveImageDataUrl(
  url: string,
  input: ExportImageProxyInput | undefined,
  caches: ExportCaches,
): Promise<string | null> {
  if (!url) return Promise.resolve(null);

  const key = imageCacheKey(url, input);
  const cached = caches.imageDataUrls.get(key);
  if (cached) return cached;

  const pending = resolveExportImageDataUrl(url, input ?? {}).catch(
    (error: unknown) => {
      console.warn("Failed to resolve image data URL for PDF export:", error);
      return null;
    },
  );
  caches.imageDataUrls.set(key, pending);
  return pending;
}

/**
 * Resolve a scanned image URL to an embeddable PDF image, or `null` when the
 * image cannot be read (in which case the slide renders without it rather than
 * failing the whole export).
 */
function resolvePdfImage(
  url: string,
  input: ExportImageProxyInput | undefined,
  caches: ExportCaches,
): Promise<PdfImage | null> {
  if (!url) return Promise.resolve(null);

  const key = imageCacheKey(url, input);
  const cached = caches.pdfImages.get(key);
  if (cached) return cached;

  const pending = resolveImageDataUrl(url, input, caches)
    .then((dataUrl) => (dataUrl ? toPdfImage(dataUrl) : null))
    .catch((error: unknown) => {
      console.warn("Failed to resolve image for PDF:", error);
      return null;
    });
  caches.pdfImages.set(key, pending);
  return pending;
}

/**
 * Add a single slide to the PDF.
 *
 * Returns whether anything visible was actually drawn — an invisible text layer
 * does not count, because it only has something to anchor to when the slide has
 * a raster or a root image beneath it. `convertToPdf` uses this to give back a
 * page it opened for a slide that turned out to be empty.
 */
async function addSlideToPdf(
  pdf: JSPDFDocument,
  scanResult: ScanResult,
  slideData: PlateSlide,
  caches: ExportCaches,
): Promise<boolean> {
  if (slideData.isImageSlide && slideData.rootImage?.url) {
    const image = await resolvePdfImage(
      slideData.rootImage.url,
      slideData.rootImage,
      caches,
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
        return true;
      } catch (error) {
        console.warn("Failed to add image slide to PDF:", error);
      }
    }
    return false;
  }

  // Layout "background" slides carry a full-bleed image. It is resolved through
  // the image proxy and handed to html-to-image as a data URL so the rasterized
  // canvas never touches a cross-origin URL.
  const backgroundImage = scanResult.backgroundImageUrl
    ? await resolvePdfImage(scanResult.backgroundImageUrl, undefined, caches)
    : null;

  // Resolved before the capture so the renderer knows whether the root image
  // has to be taken out of the cloned DOM (see `renderSlideToCanvas`).
  const rootImage = scanResult.rootImage?.url
    ? await resolvePdfImage(
        scanResult.rootImage.originalUrl ?? scanResult.rootImage.url,
        scanResult.rootImage,
        caches,
      )
    : null;

  const capture = await renderSlideToCanvas(scanResult, {
    backgroundImage,
    hasRootImage: Boolean(rootImage),
    caches,
  });

  let drawn = false;

  if (capture) {
    try {
      const imageData = capture.canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(
        imageData,
        "JPEG",
        0,
        0,
        SLIDE_WIDTH_INCHES,
        SLIDE_HEIGHT_INCHES,
      );
      drawn = true;
    } catch (error) {
      console.warn("Failed to embed slide raster in PDF:", error);
    }

    addInvisibleTextLayer(
      pdf,
      buildInvisibleTextLayer(scanResult, {
        captureWidthPx: capture.width,
        pageWidthInches: SLIDE_WIDTH_INCHES,
        pageHeightInches: SLIDE_HEIGHT_INCHES,
      }),
    );
  }

  // Non-image slides still carry a scanned root image (a picture placed next to
  // text, a chart, an infographic, ...). The clone no longer contains it, so it
  // is drawn here at its scanned position.
  if (rootImage) {
    const position = scanResult.rootImage?.position;
    if (position) {
      try {
        pdf.addImage(
          rootImage.dataUrl,
          rootImage.format,
          (position.x / 100) * SLIDE_WIDTH_INCHES,
          (position.y / 100) * SLIDE_HEIGHT_INCHES,
          (position.width / 100) * SLIDE_WIDTH_INCHES,
          (position.height / 100) * SLIDE_HEIGHT_INCHES,
        );
        drawn = true;
      } catch (error) {
        console.warn("Failed to add root image to PDF:", error);
      }
    }
  }

  return drawn;
}

/**
 * Write the scanned text into the page with PDF's invisible rendering mode.
 *
 * Nothing is painted, but the glyphs live in the content stream, so the text is
 * selectable, searchable and extractable. Each run is independent: a run jsPDF
 * refuses costs the page its search anchor for that block, not the export.
 */
function addInvisibleTextLayer(
  pdf: JSPDFDocument,
  runs: InvisibleTextRun[],
): void {
  for (const run of runs) {
    try {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(run.fontSizePt);
      pdf.text(run.lines, run.x, run.y, {
        align: run.align,
        baseline: "top",
        renderingMode: "invisible",
        lineHeightFactor: run.lineHeightFactor,
      });
    } catch (error) {
      console.warn("Failed to add invisible text layer run to PDF:", error);
    }
  }
}

type SlideCapture = {
  canvas: HTMLCanvasElement;
  /** Width of the raster in CSS pixels, i.e. the slide's own layout width. */
  width: number;
};

type RenderSlideOptions = {
  backgroundImage: PdfImage | null;
  /** Whether the root image will be drawn by `addSlideToPdf`. */
  hasRootImage: boolean;
  caches: ExportCaches;
};

/**
 * Capture size for the slide raster.
 *
 * The clone is laid out at the width the slide currently occupies in the editor
 * (its untransformed `offsetWidth`, not the zoom-scaled bounding box), so text
 * wraps into the same lines the user sees. The page then stretches that raster
 * to the full PDF page, exactly as the PPTX converter stretches its percentage
 * positions — so both formats stay visually consistent.
 */
function resolveCaptureSize(
  source: HTMLElement,
  scanResult: ScanResult,
): { width: number; height: number } {
  const width =
    source.offsetWidth ||
    source.clientWidth ||
    scanResult.sourceWidth ||
    scanResult.width ||
    SLIDE_WIDTH_PX;

  const height =
    source.offsetHeight ||
    source.clientHeight ||
    scanResult.sourceHeight ||
    scanResult.height ||
    SLIDE_HEIGHT_PX;

  return { width, height };
}

/**
 * Pixel ratio for the capture, rounded so `width * ratio` is a whole number of
 * device pixels (jsPDF's `addImage` and the canvas both truncate otherwise).
 */
function resolvePixelRatio(width: number): number {
  const deviceLimit = getOptimalPixelRatio();
  const sizeLimit = width > 0 ? TARGET_CAPTURE_WIDTH_PX / width : deviceLimit;
  const ratio = Math.max(1, Math.min(deviceLimit, sizeLimit));
  return width > 0 ? Math.max(1, Math.round(width * ratio) / width) : 1;
}

/**
 * Find the rendered slide element. `domSlideScanner` located exactly this node
 * to build the `ScanResult`, so a slide that scanned successfully still has a
 * DOM to clone unless the editor re-rendered in between.
 */
function findSlideElement(slideId: string): HTMLElement | null {
  const element = document.getElementById(`presentation-root-${slideId}`);
  return element instanceof HTMLElement ? element : null;
}

function toCssColor(hex: string | undefined, fallback: string): string {
  if (!hex) return fallback;
  const value = hex.trim();
  if (!value) return fallback;
  return value.startsWith("#") ? value : `#${value}`;
}

/**
 * Copy the resolved custom properties (`--presentation-*`) from the live slide
 * onto the capture host.
 *
 * The theme variables are usually set on `<html>`, but `ThemeBackground` scopes
 * them to its own wrapper in some layouts. Copying whatever the slide actually
 * resolved means the clone is styled identically wherever the host is mounted.
 */
function copyCustomProperties(source: HTMLElement, host: HTMLElement): void {
  // Inline declarations first: a slide that overrides `--presentation-background`
  // through `bgColor` sets it on the element itself, and reading it back from
  // the computed style is not guaranteed to enumerate custom properties.
  for (let index = 0; index < source.style.length; index++) {
    const property = source.style.item(index);
    if (!property || !property.startsWith("--")) continue;
    const value = source.style.getPropertyValue(property);
    if (value) host.style.setProperty(property, value);
  }

  const computed = window.getComputedStyle(source);
  for (let index = 0; index < computed.length; index++) {
    const property = computed.item(index);
    if (!property || !property.startsWith("--")) continue;
    const value = computed.getPropertyValue(property);
    if (value) host.style.setProperty(property, value);
  }
}

function shouldInlineUrl(url: string | null | undefined): url is string {
  // Data URLs are already inline. `blob:` URLs are same-origin and short-lived,
  // so they are left for `html-to-image` to read as-is.
  if (typeof url !== "string" || url.length === 0) return false;
  return !url.startsWith("data:") && !url.startsWith("blob:");
}

/**
 * Upper bound on how long a single image may delay a capture. Sources that were
 * rewritten to data URLs load or fail immediately; this only exists so a stalled
 * resource cannot hang the whole export.
 */
const IMAGE_LOAD_TIMEOUT_MS = 2000;

async function waitForImageElement(image: HTMLImageElement): Promise<void> {
  if (!image.complete) {
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        image.removeEventListener("load", finish);
        image.removeEventListener("error", finish);
        resolve();
      };
      const timer = setTimeout(finish, IMAGE_LOAD_TIMEOUT_MS);
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
    });
  }

  if (typeof image.decode === "function") {
    await image.decode().catch(() => undefined);
  }
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "function") {
      resolve();
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function normalizeFontFamily(font: string): string {
  return font.trim().replace(/["']/g, "");
}

type StyledCloneNode = {
  element: HTMLElement;
  backgroundImage: string;
  maskImage: string;
};

type CloneInspection = {
  /** Elements whose CSS still references a remote resource. */
  styled: StyledCloneNode[];
  /** Every font family the capture will ask `html-to-image` to embed. */
  fontFamilies: Set<string>;
};

/**
 * Single read pass over the clone: everything that has to be resolved before the
 * capture is collected here so the walk never interleaves a style read with a
 * style write (which would thrash layout once per node).
 */
function inspectClone(node: HTMLElement): CloneInspection {
  const styled: StyledCloneNode[] = [];
  const fontFamilies = new Set<string>();

  for (const element of [node, ...Array.from(node.querySelectorAll("*"))]) {
    if (!(element instanceof HTMLElement)) continue;

    const computed = window.getComputedStyle(element);

    // `html-to-image` collects the font families to embed from inline style
    // first and computed style second; mirroring that here makes the cache key
    // below describe exactly the fonts the capture will ask for.
    const declared = element.style.fontFamily || computed.fontFamily;
    for (const family of declared.split(",")) {
      const normalized = normalizeFontFamily(family);
      if (normalized) fontFamilies.add(normalized);
    }

    const backgroundImage = computed.backgroundImage ?? "";
    const maskImage = computed.maskImage ?? "";
    if (
      backgroundImage?.includes("url(") ||
      maskImage?.includes("url(")
    ) {
      styled.push({ element, backgroundImage, maskImage });
    }
  }

  return { styled, fontFamilies };
}

/**
 * Resolve every `url()` in a CSS value to a data URL.
 */
async function inlineCssUrls(
  value: string,
  caches: ExportCaches,
): Promise<string> {
  const urls = new Set<string>();
  for (const match of value.matchAll(URL_TOKEN)) {
    const url = match[2];
    if (shouldInlineUrl(url)) urls.add(url);
  }
  if (urls.size === 0) return value;

  const resolved = new Map<string, string>();
  await Promise.all(
    Array.from(urls).map(async (url) => {
      const dataUrl = await resolveImageDataUrl(url, undefined, caches);
      resolved.set(url, dataUrl ?? TRANSPARENT_PIXEL_DATA_URL);
    }),
  );

  // Single pass so a URL that appears twice is rewritten twice.
  return value.replace(URL_TOKEN, (match, _quote: string, url: string) => {
    const dataUrl = url ? resolved.get(url) : undefined;
    return dataUrl ? `url("${dataUrl}")` : match;
  });
}

/**
 * Replace every remote image reference inside the clone with a data URL.
 *
 * Two passes, in this order:
 *  1. `<img src>` — read in one synchronous sweep, written as the resolutions
 *     land, and `srcset`/`loading` cleared so the browser cannot pick a remote
 *     candidate or defer loading for an off-screen clone.
 *  2. computed `background-image` / `mask-image` — `html-to-image` copies these
 *     onto its internal clone and re-fetches them, which is a CORS dependency
 *     this export refuses to take.
 */
async function inlineCloneImages(
  node: HTMLElement,
  caches: ExportCaches,
): Promise<CloneInspection> {
  const images = Array.from(node.querySelectorAll("img"));
  const imageWrites = images.map((image) => {
    const url = image.getAttribute("src");
    image.removeAttribute("srcset");
    image.removeAttribute("sizes");
    image.loading = "eager";
    if (!shouldInlineUrl(url)) return Promise.resolve();

    return resolveImageDataUrl(url, undefined, caches).then((dataUrl) => {
      image.setAttribute("src", dataUrl ?? TRANSPARENT_PIXEL_DATA_URL);
    });
  });

  const inspection = inspectClone(node);

  const styleWrites = inspection.styled.map(async (entry) => {
    // `setProperty` takes the CSS property name, not the `CSSStyleDeclaration`
    // camelCase one: `setProperty("backgroundImage", ...)` is a silent no-op in
    // every browser, which would leave the remote URL in place for
    // `html-to-image` to re-fetch — the tainting this pass exists to prevent.
    const updates: Array<[string, string]> = [];
    if (entry.backgroundImage) {
      updates.push([
        "background-image",
        await inlineCssUrls(entry.backgroundImage, caches),
      ]);
    }
    if (entry.maskImage) {
      updates.push([
        "mask-image",
        await inlineCssUrls(entry.maskImage, caches),
      ]);
    }
    for (const [property, value] of updates) {
      entry.element.style.setProperty(property, value);
    }
  });

  await Promise.all([...imageWrites, ...styleWrites]);
  return inspection;
}

/**
 * Font CSS for the clone, memoized per font set.
 *
 * `html-to-image` can only embed the web fonts it can find as `@font-face`
 * rules, and the raster is painted in an isolated SVG document that has no
 * access to the fonts the page itself has loaded. Skipping the embed (as the
 * thumbnail capture does) therefore renders every slide in a fallback typeface.
 * The embed is comparatively expensive, so the CSS is computed once per
 * distinct font set and reused for every other slide with the same typography.
 *
 * A failure is cached as `null`, which means "let `html-to-image` do its own
 * default" rather than "embed nothing".
 */
function resolveFontEmbedCss(
  node: HTMLElement,
  signature: string,
  caches: ExportCaches,
): Promise<string | null> {
  const cached = caches.fontCss.get(signature);
  if (cached) return cached;

  const pending = import("html-to-image")
    .then(({ getFontEmbedCSS }) => getFontEmbedCSS(node))
    .then((css) => (css.trim() ? css : null))
    .catch((error: unknown) => {
      console.warn("Failed to build font CSS for PDF export:", error);
      return null;
    });
  caches.fontCss.set(signature, pending);
  return pending;
}

/**
 * Remove the slide's root image from the clone when `addSlideToPdf` is going to
 * draw it from the scan result instead.
 *
 * Leaving it in would paint the same artwork twice — once through the raster at
 * whatever size the editor laid out, once through `addImage` at the scanned
 * position. When the scanned root image could *not* be resolved the node stays
 * put, so a proxy failure degrades to "rasterized in place" instead of "gone".
 */
function detachRootImage(node: HTMLElement, slideId: string): void {
  for (const candidate of Array.from(
    node.querySelectorAll("[data-root-image]"),
  )) {
    if (candidate.getAttribute("data-root-image") === slideId) {
      candidate.remove();
    }
  }
}

/**
 * Render a slide to canvas by cloning the live slide DOM into an off-screen
 * capture host.
 */
async function renderSlideToCanvas(
  scanResult: ScanResult,
  options: RenderSlideOptions,
): Promise<SlideCapture | null> {
  const { toCanvas } = await import("html-to-image");
  const { backgroundImage, hasRootImage, caches } = options;

  const source = findSlideElement(scanResult.slideId);
  if (!source) {
    console.warn(
      `Slide container not found for PDF export: ${scanResult.slideId}`,
    );
    return null;
  }

  const backgroundColor = toCssColor(
    scanResult.styles.backgroundColor,
    "#ffffff",
  );

  const host = document.createElement("div");
  // Same off-screen mounting as the presentation thumbnail capture: `fixed`
  // keeps it out of document flow, so the editor's layout is untouched.
  host.setAttribute("aria-hidden", "true");
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "-10000px";
  host.style.zIndex = "-50";
  host.style.overflow = "hidden";
  host.style.pointerEvents = "none";
  host.style.backgroundColor = backgroundColor;
  if (backgroundImage) {
    host.style.backgroundImage = `url("${backgroundImage.dataUrl}")`;
    host.style.backgroundSize = "cover";
    host.style.backgroundPosition = "center";
    host.style.backgroundRepeat = "no-repeat";
  }

  copyCustomProperties(source, host);

  const node = source.cloneNode(true) as HTMLElement;
  // The clone must not answer to the same id as the live slide, must not be
  // editable, and must not carry the editor's selection chrome.
  node.removeAttribute("id");
  node.removeAttribute("contenteditable");
  node.setAttribute("aria-hidden", "true");
  node.style.border = "none";
  node.style.boxShadow = "none";
  node.style.transform = "none";

  const { width, height } = resolveCaptureSize(source, scanResult);
  node.style.width = `${width}px`;
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;

  if (hasRootImage) {
    detachRootImage(node, scanResult.slideId);
  }

  host.appendChild(node);
  document.body.appendChild(host);

  try {
    const inspection = await inlineCloneImages(node, caches);
    const fontEmbedCSS = await resolveFontEmbedCss(
      node,
      Array.from(inspection.fontFamilies).sort().join("|"),
      caches,
    );

    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => undefined);
    }
    await Promise.all(
      Array.from(host.querySelectorAll("img")).map(waitForImageElement),
    );
    await waitForAnimationFrame();

    const canvas = await toCanvas(host, {
      backgroundColor,
      // Fonts are embedded (see `resolveFontEmbedCss`) because the raster is
      // painted in an isolated document. `imagePlaceholder` keeps a failed
      // resource from leaving an `<img src="">` that never fires `load`.
      imagePlaceholder: TRANSPARENT_PIXEL_DATA_URL,
      ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
      pixelRatio: resolvePixelRatio(width),
      // Embeds and videos cannot be rasterized; the editor renders them as
      // static content, so dropping them matches what the user sees.
      filter: (domNode) =>
        domNode.tagName !== "IFRAME" && domNode.tagName !== "VIDEO",
    });

    return { canvas, width };
  } catch (error) {
    console.warn("Failed to render slide to canvas:", error);
    return null;
  } finally {
    host.remove();
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
