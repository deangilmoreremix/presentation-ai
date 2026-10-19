/**
 * Invisible text layer for the DOM-based PDF export.
 *
 * ## Why a text layer at all
 *
 * A slide raster produced by `html-to-image` is a bitmap. A PDF built from
 * bitmaps alone therefore has no text at all: nothing is selectable, nothing is
 * searchable, and a screen reader or `pdftotext` sees an empty page. That is a
 * real regression against the PPTX path, where the scanner's text elements
 * become real text runs.
 *
 * The obvious fix — re-draw the scanned text as *visible* jsPDF text on top of
 * the raster — is worse than the raster itself. Every glyph would be painted
 * twice (the bitmap copy is already there), jsPDF only ships the 14 standard
 * fonts, and its line breaking has no knowledge of the web fonts the slides
 * actually use, so the two copies would drift apart. The page would look worse,
 * not better.
 *
 * Instead the scanned text is written with PDF's invisible text rendering mode
 * (`Tr 3`): the glyphs stay in the content stream — extractable, selectable and
 * searchable — but paint nothing. Visually the page is the raster; textually it
 * is a real text layer. This is the same hybrid that "image + text layer" PDF
 * tools use, and it degrades gracefully: a run that jsPDF refuses is dropped
 * and the page keeps its raster.
 *
 * Positions come from the very same `ScanResult` that drives the PPTX export
 * (percentages of the slide box), so the layer cannot drift from the raster: it
 * is derived from one scan, not from a second, independent DOM walk.
 */

import {
  type ExportElement,
  type ScanResult,
  type ShapeExportElement,
  type TableExportElement,
  type TextExportElement,
} from "./types";

const POINTS_PER_INCH = 72;

/** Font sizes outside this range are clamped; they are only a search anchor. */
const MIN_FONT_SIZE_PT = 4;
const MAX_FONT_SIZE_PT = 200;

const DEFAULT_FONT_SIZE_PX = 16;

export type PdfTextAlign = "left" | "center" | "right";

/**
 * One invisible text run, in PDF page coordinates (inches, origin top-left).
 * `lines` maps 1:1 onto the visual lines of the scanned block.
 */
export interface InvisibleTextRun {
  lines: string[];
  /** Left edge of the text box, inches. */
  x: number;
  /** Top edge of the text box, inches. */
  y: number;
  fontSizePt: number;
  lineHeightFactor: number;
  align: PdfTextAlign;
}

export interface InvisibleTextLayerOptions {
  /**
   * Pixel width the slide raster was captured at. Scanned font sizes are CSS px
   * in the editor's own layout, so this is what converts them to page inches.
   */
  captureWidthPx: number;
  /** Width of the PDF page, inches. */
  pageWidthInches: number;
  /** Height of the PDF page, inches. */
  pageHeightInches: number;
}

/**
 * Code points that WinAnsi (the encoding of all 14 jsPDF standard fonts)
 * actually covers. jsPDF does not throw on unmappable characters, it writes the
 * raw code point, so an unfiltered string would put garbage into the extracted
 * text and break search. Latin-1 plus the cp1252 punctuation block is the safe
 * set; anything else (CJK, emoji, ...) is dropped rather than replaced so it
 * cannot corrupt neighbouring words.
 */
const WIN_ANSI_EXTRA_CODE_POINTS = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

export function isWinAnsiEncodable(codePoint: number): boolean {
  if (codePoint >= 0x20 && codePoint <= 0x7e) return true;
  if (codePoint >= 0xa0 && codePoint <= 0xff) return true;
  return WIN_ANSI_EXTRA_CODE_POINTS.has(codePoint);
}

/** Drop characters the PDF standard fonts cannot represent. */
export function sanitizeWinAnsiText(value: string): string {
  let result = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    // Control characters (including the line separators we split on) carry no
    // glyph and confuse jsPDF's text escaping.
    if (codePoint < 0x20 || codePoint === 0x7f) continue;
    if (isWinAnsiEncodable(codePoint)) result += character;
  }
  return result;
}

function toLines(value: string): string[] {
  return value
    .split(/\r\n|\r|\n/)
    .map((line) => sanitizeWinAnsiText(line).trim())
    .filter((line) => line.length > 0);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function toAlign(align: string | undefined): PdfTextAlign {
  // `justify` needs a measure to justify against; without one jsPDF would emit
  // odd spacing, and the run is invisible anyway, so it collapses to `left`.
  if (align === "center" || align === "right") return align;
  return "left";
}

function positionToInches(
  position: { x: number; y: number; width: number; height: number },
  pageWidthInches: number,
  pageHeightInches: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: (position.x / 100) * pageWidthInches,
    y: (position.y / 100) * pageHeightInches,
    width: (position.width / 100) * pageWidthInches,
    height: (position.height / 100) * pageHeightInches,
  };
}

function fontSizePxToPoints(fontSizePx: number, pxToInches: number): number {
  return clamp(
    fontSizePx * pxToInches * POINTS_PER_INCH,
    MIN_FONT_SIZE_PT,
    MAX_FONT_SIZE_PT,
  );
}

function lineHeightFactor(
  lineHeightPx: number | undefined,
  fontSizePx: number,
): number {
  // `extractTextStyles` reports a computed `line-height: normal` as
  // `undefined`, so an absent or non-numeric line height is the 1.2 default.
  if (!lineHeightPx || !Number.isFinite(lineHeightPx) || fontSizePx <= 0) {
    return 1.2;
  }
  return clamp(lineHeightPx / fontSizePx, 0.8, 3);
}

function buildTextRun(
  element: TextExportElement,
  pageWidthInches: number,
  pageHeightInches: number,
  pxToInches: number,
): InvisibleTextRun | null {
  const lines = toLines(element.textContent);
  if (lines.length === 0) return null;

  const box = positionToInches(element.position, pageWidthInches, pageHeightInches);
  const fontSizePx =
    element.textStyles.fontSize > 0 && Number.isFinite(element.textStyles.fontSize)
      ? element.textStyles.fontSize
      : DEFAULT_FONT_SIZE_PX;

  return {
    lines,
    x: box.x,
    y: box.y,
    fontSizePt: fontSizePxToPoints(fontSizePx, pxToInches),
    lineHeightFactor: lineHeightFactor(element.textStyles.lineHeight, fontSizePx),
    align: toAlign(element.textStyles.textAlign),
  };
}

/**
 * Shape labels (arrow captions, "Step 1", pill text) are real visible text in
 * the raster, so they belong in the text layer too. The scanner does not record
 * a font size for them, so the box height drives it — the same heuristic the
 * PPTX converter uses for these labels.
 */
function buildShapeRun(
  element: ShapeExportElement,
  pageWidthInches: number,
  pageHeightInches: number,
): InvisibleTextRun | null {
  const lines = toLines(element.textContent ?? "");
  if (lines.length === 0) return null;

  const box = positionToInches(element.position, pageWidthInches, pageHeightInches);

  return {
    lines,
    // `jsPDF` centres each line *about* `x`, not inside a box, so a centred
    // shape label has to be anchored at the middle of the shape — the same
    // `align: "center"` over the full box width the PPTX converter uses.
    x: box.x + box.width / 2,
    y: box.y + box.height * 0.27,
    fontSizePt: clamp(box.height * POINTS_PER_INCH * 0.42, 6, 24),
    lineHeightFactor: 1.2,
    align: "center",
  };
}

/**
 * Table cells carry their box in pixels relative to the table element, so the
 * cell grid is mapped onto the table's scanned page box. Without a measurable
 * cell extent there is no scale to apply and the table is skipped.
 *
 * `measureScale` converts the editor's zoomed viewport pixels into the layout
 * pixels every other size in this module is expressed in — see
 * `buildInvisibleTextLayer`.
 */
function buildTableRuns(
  element: TableExportElement,
  pageWidthInches: number,
  pageHeightInches: number,
  measureScale: number,
): InvisibleTextRun[] {
  const tableBox = positionToInches(
    element.position,
    pageWidthInches,
    pageHeightInches,
  );

  let tableWidthPx = 0;
  for (const row of element.rows) {
    for (const cell of row.cells) {
      if (!cell.box) continue;
      tableWidthPx = Math.max(tableWidthPx, cell.box.x + cell.box.width);
    }
  }

  if (tableWidthPx <= 0) return [];

  const pxToInches = tableBox.width / (tableWidthPx * measureScale);
  const cellToInches = measureScale * pxToInches;
  const runs: InvisibleTextRun[] = [];

  for (const row of element.rows) {
    for (const cell of row.cells) {
      if (!cell.box) continue;
      const lines = toLines(cell.text);
      if (lines.length === 0) continue;

      const fontSizePx =
        cell.textStyles?.fontSize && cell.textStyles.fontSize > 0
          ? cell.textStyles.fontSize
          : DEFAULT_FONT_SIZE_PX;

      runs.push({
        lines,
        x: tableBox.x + cell.box.x * cellToInches,
        y: tableBox.y + cell.box.y * cellToInches,
        fontSizePt: fontSizePxToPoints(fontSizePx, pxToInches),
        lineHeightFactor: lineHeightFactor(
          cell.textStyles?.lineHeight,
          fontSizePx,
        ),
        align: toAlign(cell.textStyles?.textAlign),
      });
    }
  }

  return runs;
}

function buildElementRuns(
  element: ExportElement,
  pageWidthInches: number,
  pageHeightInches: number,
  pxToInches: number,
  measureScale: number,
): InvisibleTextRun[] {
  switch (element.type) {
    case "text":
      return [
        buildTextRun(element, pageWidthInches, pageHeightInches, pxToInches),
      ].filter((run): run is InvisibleTextRun => run !== null);
    case "shape":
      return [
        buildShapeRun(element, pageWidthInches, pageHeightInches),
      ].filter((run): run is InvisibleTextRun => run !== null);
    case "table":
      return buildTableRuns(
        element,
        pageWidthInches,
        pageHeightInches,
        measureScale,
      );
    default:
      // Images, decor snapshots and background rectangles have no text.
      return [];
  }
}

/**
 * Build the invisible text layer for one scanned slide.
 *
 * `pageWidthInches` / `pageHeightInches` describe the PDF page; scanned
 * positions are percentages of the slide, so they map straight onto it.
 */
export function buildInvisibleTextLayer(
  scanResult: ScanResult,
  options: InvisibleTextLayerOptions,
): InvisibleTextRun[] {
  const { captureWidthPx, pageWidthInches, pageHeightInches } = options;

  // Guard against a zero/absent capture width: the font size conversion would
  // collapse every run to the 4pt floor and make the layer useless.
  const pxToInches = captureWidthPx > 0 ? pageWidthInches / captureWidthPx : 0;

  // The scanner measures `element.position` as a percentage of the slide's
  // *rendered* rect (`width`) while recording the untransformed layout size
  // (`sourceWidth`), so this is the factor between viewport pixels and the
  // layout pixels `fontSize` is expressed in. Table cell boxes are the one
  // measurement that is still in raw viewport pixels and needs converting;
  // everywhere else a percentage has already cancelled the zoom out.
  const measureScale =
    scanResult.width > 0 && scanResult.sourceWidth > 0
      ? scanResult.sourceWidth / scanResult.width
      : 1;

  const runs: InvisibleTextRun[] = [];
  for (const element of scanResult.elements) {
    runs.push(
      ...buildElementRuns(
        element,
        pageWidthInches,
        pageHeightInches,
        pxToInches,
        measureScale,
      ),
    );
  }

  return runs;
}
