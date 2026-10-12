import { describe, expect, it } from "vitest";

import {
  buildInvisibleTextLayer,
  isWinAnsiEncodable,
  sanitizeWinAnsiText,
} from "@/components/presentation/export/pdfTextLayer";
import {
  type ScanResult,
  type TableExportElement,
  type TextExportElement,
} from "@/components/presentation/export/types";

const PAGE_WIDTH_INCHES = 10;
const PAGE_HEIGHT_INCHES = 5.625;

function makeStyles(): ScanResult["styles"] {
  return {
    primaryColor: "7C3AED",
    secondaryColor: "C7D2FE",
    accentColor: "A78BFA",
    backgroundColor: "FFFFFF",
    textColor: "3F3F46",
    headingColor: "312E81",
    cardBackground: "F3F4F6",
    smartLayoutColor: "3B82F6",
    headingFont: "Lora",
    bodyFont: "Inter",
    cardBorderRadius: "1rem",
    slideBorderRadius: "0px",
    buttonBorderRadius: "0.5rem",
    cardShadow: "none",
    buttonShadow: "none",
    slideShadow: "none",
    transition: "none",
  };
}

function makeScanResult(elements: ScanResult["elements"]): ScanResult {
  return {
    slideId: "slide-1",
    width: 1280,
    height: 720,
    sourceWidth: 1280,
    sourceHeight: 720,
    elements,
    styles: makeStyles(),
  };
}

function makeTextElement(
  overrides: Partial<TextExportElement> = {},
): TextExportElement {
  return {
    type: "text",
    textContent: "Quarterly results",
    textStyles: {
      fontFamily: "Lora",
      fontSize: 48,
      fontWeight: "700",
      color: "111827",
      textAlign: "left",
    },
    nodeType: "h1",
    position: { x: 10, y: 20, width: 50, height: 10 },
    ...overrides,
  };
}

const LAYER_OPTIONS = {
  captureWidthPx: 1280,
  pageWidthInches: PAGE_WIDTH_INCHES,
  pageHeightInches: PAGE_HEIGHT_INCHES,
};

describe("sanitizeWinAnsiText", () => {
  it("keeps Latin-1 and cp1252 punctuation", () => {
    expect(sanitizeWinAnsiText("Café — “smart” quotes… 50 €")).toBe(
      "Café — “smart” quotes… 50 €",
    );
  });

  it("drops characters the PDF standard fonts cannot encode", () => {
    // jsPDF writes unencodable code points verbatim instead of throwing, so an
    // unfiltered string would inject garbage into the extracted text layer.
    expect(sanitizeWinAnsiText("增长 chart")).toBe(" chart");
    expect(sanitizeWinAnsiText("a\u0000b")).toBe("ab");
  });

  it("classifies the WinAnsi range", () => {
    expect(isWinAnsiEncodable(0x41)).toBe(true);
    expect(isWinAnsiEncodable(0xe9)).toBe(true);
    expect(isWinAnsiEncodable(0x2014)).toBe(true);
    expect(isWinAnsiEncodable(0x4e2d)).toBe(false);
  });
});

describe("buildInvisibleTextLayer", () => {
  it("maps scanned text onto page inches and splits it into visual lines", () => {
    const runs = buildInvisibleTextLayer(
      makeScanResult([
        makeTextElement({ textContent: "Title\nSubtitle" }),
      ]),
      LAYER_OPTIONS,
    );

    expect(runs).toHaveLength(1);
    expect(runs[0]?.lines).toEqual(["Title", "Subtitle"]);
    // 10% / 20% of a 10in x 5.625in page.
    expect(runs[0]?.x).toBeCloseTo(1, 6);
    expect(runs[0]?.y).toBeCloseTo(1.125, 6);
    // 48 CSS px captured at 1280px across a 10in page -> 48 * 72 / 128 pt.
    expect(runs[0]?.fontSizePt).toBeCloseTo(27, 6);
  });

  it("skips empty text blocks instead of emitting blank runs", () => {
    const runs = buildInvisibleTextLayer(
      makeScanResult([makeTextElement({ textContent: "   \n  " })]),
      LAYER_OPTIONS,
    );

    expect(runs).toEqual([]);
  });

  it("derives the line height factor from the scanned line height", () => {
    const runs = buildInvisibleTextLayer(
      makeScanResult([
        makeTextElement({
          textStyles: {
            fontFamily: "Inter",
            fontSize: 20,
            fontWeight: "400",
            color: "111827",
            lineHeight: 30,
          },
        }),
      ]),
      LAYER_OPTIONS,
    );

    expect(runs[0]?.lineHeightFactor).toBeCloseTo(1.5, 6);
  });

  it("maps table cells through the table's scanned box", () => {
    const table: TableExportElement = {
      type: "table",
      position: { x: 0, y: 50, width: 100, height: 40 },
      rows: [
        {
          cells: [
            {
              text: "Region",
              isHeader: true,
              box: { x: 0, y: 0, width: 640, height: 40 },
              textStyles: {
                fontFamily: "Inter",
                fontSize: 16,
                fontWeight: "700",
                color: "111827",
              },
            },
            {
              text: "EMEA",
              isHeader: false,
              box: { x: 640, y: 0, width: 640, height: 40 },
              textStyles: {
                fontFamily: "Inter",
                fontSize: 16,
                fontWeight: "400",
                color: "111827",
              },
            },
          ],
        },
      ],
    };

    const runs = buildInvisibleTextLayer(
      makeScanResult([table]),
      LAYER_OPTIONS,
    );

    expect(runs).toHaveLength(2);
    expect(runs[0]?.lines).toEqual(["Region"]);
    expect(runs[0]?.x).toBeCloseTo(0, 6);
    // Second cell starts halfway across the table, which spans the page.
    expect(runs[1]?.x).toBeCloseTo(5, 6);
    // 16 CSS px over a 1280px table drawn across 10in -> 9pt.
    expect(runs[0]?.fontSizePt).toBeCloseTo(9, 6);
  });

  it("keeps table cells on scale when the editor is zoomed to fit", () => {
    const table: TableExportElement = {
      type: "table",
      position: { x: 0, y: 50, width: 100, height: 40 },
      rows: [
        {
          cells: [
            {
              text: "Region",
              isHeader: true,
              // Measured in viewport pixels at half the layout scale.
              box: { x: 0, y: 0, width: 320, height: 20 },
              textStyles: {
                fontFamily: "Inter",
                fontSize: 16,
                fontWeight: "700",
                color: "111827",
              },
            },
            {
              text: "EMEA",
              isHeader: false,
              box: { x: 320, y: 0, width: 320, height: 20 },
              textStyles: {
                fontFamily: "Inter",
                fontSize: 16,
                fontWeight: "400",
                color: "111827",
              },
            },
          ],
        },
      ],
    };

    // The scanner saw the slide at 640 rendered px for a 1280px layout.
    const scanResult: ScanResult = {
      ...makeScanResult([table]),
      width: 640,
      height: 360,
      sourceWidth: 1280,
      sourceHeight: 720,
    };

    const runs = buildInvisibleTextLayer(scanResult, LAYER_OPTIONS);

    expect(runs).toHaveLength(2);
    // Half the measured width still lands halfway across the page.
    expect(runs[1]?.x).toBeCloseTo(5, 6);
    // ...and the font size is the unscaled 16 CSS px -> 9pt, not 18pt.
    expect(runs[0]?.fontSizePt).toBeCloseTo(9, 6);
  });

  it("skips a table whose cells carry no measured box", () => {
    const runs = buildInvisibleTextLayer(
      makeScanResult([
        {
          type: "table",
          position: { x: 0, y: 0, width: 100, height: 40 },
          rows: [{ cells: [{ text: "Region", isHeader: true }] }],
        },
      ]),
      LAYER_OPTIONS,
    );

    expect(runs).toEqual([]);
  });

  it("includes shape labels and ignores non-text elements", () => {
    const runs = buildInvisibleTextLayer(
      makeScanResult([
        {
          type: "shape",
          shapeType: "pill",
          orientation: "horizontal",
          fillColor: "#7C3AED",
          textContent: "Step 1",
          position: { x: 10, y: 10, width: 20, height: 10 },
        },
        {
          type: "image",
          url: "https://cdn.example.com/photo.png",
          sizing: "contain",
          position: { x: 0, y: 0, width: 20, height: 20 },
        },
      ]),
      LAYER_OPTIONS,
    );

    expect(runs).toHaveLength(1);
    expect(runs[0]?.lines).toEqual(["Step 1"]);
    expect(runs[0]?.align).toBe("center");
    // `jsPDF` centres a line about `x`, so the anchor must be the middle of the
    // shape box (20% wide, starting at 10% -> centre at 20% of a 10in page).
    expect(runs[0]?.x).toBeCloseTo(2, 6);
  });

  it("keeps font sizes usable when the capture width is unknown", () => {
    const runs = buildInvisibleTextLayer(makeScanResult([makeTextElement()]), {
      captureWidthPx: 0,
      pageWidthInches: PAGE_WIDTH_INCHES,
      pageHeightInches: PAGE_HEIGHT_INCHES,
    });

    expect(runs[0]?.fontSizePt).toBeGreaterThan(0);
  });
});
