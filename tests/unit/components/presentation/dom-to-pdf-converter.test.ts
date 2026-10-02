import { beforeEach, describe, expect, it, vi } from "vitest";

import { type ScanResult } from "@/components/presentation/export/types";

const toCanvasMock = vi.fn();
const getFontEmbedCSSMock = vi.fn();
const resolveExportImageDataUrlMock = vi.fn();

vi.mock("html-to-image", () => ({
  toCanvas: (...args: unknown[]) => toCanvasMock(...args),
  getFontEmbedCSS: (...args: unknown[]) => getFontEmbedCSSMock(...args),
}));

vi.mock("@/lib/image-proxy", () => ({
  resolveExportImageDataUrl: (...args: unknown[]) =>
    resolveExportImageDataUrlMock(...args),
}));

const addImageCalls: unknown[][] = [];
const textCalls: Array<{
  text: string | string[];
  x: number;
  y: number;
  options: Record<string, unknown>;
}> = [];
const addPageCalls: unknown[][] = [];
const deletedPages: number[] = [];

vi.mock("jspdf", () => ({
  jsPDF: class {
    private pageCount = 1;
    addPage(...args: unknown[]) {
      addPageCalls.push(args);
      this.pageCount++;
    }
    addImage(...args: unknown[]) {
      addImageCalls.push(args);
    }
    deletePage(pageNumber: number) {
      deletedPages.push(pageNumber);
      this.pageCount--;
    }
    getImageProperties() {
      return { width: 1280, height: 720 };
    }
    getNumberOfPages() {
      return this.pageCount;
    }
    output() {
      return new ArrayBuffer(8);
    }
    setFont() {}
    setFontSize() {}
    text(
      text: string | string[],
      x: number,
      y: number,
      options: Record<string, unknown>,
    ) {
      textCalls.push({ text, x, y, options });
    }
  },
}));

const { convertToPdf } = await import(
  "@/components/presentation/export/domToPdfConverter"
);

const REMOTE_IMAGE = "https://cdn.example.com/photo.png";
const INLINED_DATA_URL = "data:image/png;base64,INLINED";
const RASTER_DATA_URL = "data:image/jpeg;base64,RASTER";

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    slideId: "slide-1",
    width: 1280,
    height: 720,
    sourceWidth: 1280,
    sourceHeight: 720,
    elements: [
      {
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
      },
    ],
    styles: {
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
    },
    ...overrides,
  };
}

/** Mirrors the DOM `SlidesContainer` renders for every slide. */
function mountSlideDom(slideId: string): HTMLElement {
  const slide = document.createElement("div");
  slide.id = `presentation-root-${slideId}`;
  slide.setAttribute("contenteditable", "true");
  slide.style.fontFamily = "Lora, serif";
  slide.innerHTML = `
    <h1 style="font-family: Lora, serif">Quarterly results</h1>
    <p>Revenue grew across every region.</p>
    <img src="${REMOTE_IMAGE}" />
    <table><tbody><tr><th>Region</th><th>Revenue</th></tr></tbody></table>
    <div data-shape="true" data-shape-text="Step 1" style="width: 120px; height: 48px"></div>
    <div data-root-image="${slideId}"><img src="https://cdn.example.com/root.png" /></div>
  `;
  document.body.appendChild(slide);
  return slide;
}

beforeEach(() => {
  document.body.innerHTML = "";
  addImageCalls.length = 0;
  textCalls.length = 0;
  addPageCalls.length = 0;
  deletedPages.length = 0;

  // jsdom never loads images, so `complete` stays false forever.
  Object.defineProperty(HTMLImageElement.prototype, "complete", {
    configurable: true,
    get: () => true,
  });

  toCanvasMock.mockReset();
  getFontEmbedCSSMock.mockReset();
  resolveExportImageDataUrlMock.mockReset();

  getFontEmbedCSSMock.mockResolvedValue("@font-face{font-family:Lora}");
  resolveExportImageDataUrlMock.mockImplementation(async (url: string) =>
    url.startsWith("data:") ? url : INLINED_DATA_URL,
  );
  toCanvasMock.mockImplementation(async () => ({
    toDataURL: () => RASTER_DATA_URL,
  }));
});

describe("convertToPdf", () => {
  it("rasterizes a clone of the live slide DOM, not an empty container", async () => {
    const slide = mountSlideDom("slide-1");

    await convertToPdf([makeScanResult()], [{ id: "slide-1", content: [] }]);

    expect(toCanvasMock).toHaveBeenCalledTimes(1);
    const host = toCanvasMock.mock.calls[0]?.[0] as HTMLElement;

    // The captured node carries the slide's text, table and shape.
    expect(host.textContent).toContain("Quarterly results");
    expect(host.querySelector("table")).not.toBeNull();
    expect(host.querySelector("[data-shape]")).not.toBeNull();
    // ...and it is a clone: the live editor slide is untouched.
    expect(host).not.toBe(slide);
    expect(host.contains(slide)).toBe(false);
    // The clone is measured at the slide's own layout width, not the PDF page.
    expect(host.style.width).toBe("1280px");
  });

  it("inlines every image as a data URL before the capture", async () => {
    mountSlideDom("slide-1");

    await convertToPdf([makeScanResult()], [{ id: "slide-1", content: [] }]);

    const host = toCanvasMock.mock.calls[0]?.[0] as HTMLElement;
    for (const image of Array.from(host.querySelectorAll("img"))) {
      expect(image.getAttribute("src")?.startsWith("data:")).toBe(true);
    }
    // A cross-origin URL reaching the canvas would taint it and throw.
    expect(resolveExportImageDataUrlMock).toHaveBeenCalledWith(
      REMOTE_IMAGE,
      {},
    );
  });

  it("inlines background-image urls before the capture", async () => {
    const BACKDROP = "https://cdn.example.com/backdrop.png";
    const slide = mountSlideDom("slide-1");

    const backdrop = document.createElement("div");
    backdrop.dataset.backdrop = "true";
    backdrop.style.backgroundImage = `url("${BACKDROP}")`;
    slide.appendChild(backdrop);

    await convertToPdf([makeScanResult()], [{ id: "slide-1", content: [] }]);

    const host = toCanvasMock.mock.calls[0]?.[0] as HTMLElement;
    // `html-to-image` re-fetches every non-data `url()` it finds in a cloned
    // element's CSS, so a remote background would either be dropped as a CORS
    // failure or taint the capture canvas.
    const captured = host.querySelector<HTMLElement>("[data-backdrop]");
    expect(captured?.style.backgroundImage ?? "").not.toContain("https://");
    expect(captured?.style.backgroundImage ?? "").toContain("data:");
    expect(resolveExportImageDataUrlMock).toHaveBeenCalledWith(BACKDROP, {});
  });

  it("resolves each image once per export", async () => {
    document.body.innerHTML = "";
    for (const slideId of ["slide-1", "slide-2", "slide-3"]) {
      mountSlideDom(slideId);
    }

    await convertToPdf(
      [
        makeScanResult({ slideId: "slide-1" }),
        makeScanResult({ slideId: "slide-2" }),
        makeScanResult({ slideId: "slide-3" }),
      ],
      [
        { id: "slide-1", content: [] },
        { id: "slide-2", content: [] },
        { id: "slide-3", content: [] },
      ],
    );

    const inContentRequests = resolveExportImageDataUrlMock.mock.calls.filter(
      ([url]) => url === REMOTE_IMAGE,
    );
    expect(inContentRequests).toHaveLength(1);
  });

  it("leaves the root image to the scanned image path instead of drawing it twice", async () => {
    mountSlideDom("slide-1");

    await convertToPdf(
      [
        makeScanResult({
          rootImage: {
            url: "https://cdn.example.com/root.png",
            originalUrl: "https://cdn.example.com/root.png",
            position: { x: 50, y: 10, width: 40, height: 60 },
          },
        }),
      ],
      [{ id: "slide-1", content: [] }],
    );

    const host = toCanvasMock.mock.calls[0]?.[0] as HTMLElement;
    expect(host.querySelector("[data-root-image]")).toBeNull();
    // Raster first, then the scanned root image on top of it.
    expect(addImageCalls).toHaveLength(2);
    expect(addImageCalls[0]?.[1]).toBe("JPEG");
    expect(addImageCalls[1]?.[2]).toBeCloseTo(5, 6);
    expect(addImageCalls[1]?.[3]).toBeCloseTo(0.5625, 6);
  });

  it("keeps the root image in the raster when it cannot be resolved", async () => {
    mountSlideDom("slide-1");
    resolveExportImageDataUrlMock.mockImplementation(async (url: string) =>
      url.includes("root.png") ? null : INLINED_DATA_URL,
    );

    await convertToPdf(
      [
        makeScanResult({
          rootImage: {
            url: "https://cdn.example.com/root.png",
            position: { x: 50, y: 10, width: 40, height: 60 },
          },
        }),
      ],
      [{ id: "slide-1", content: [] }],
    );

    const host = toCanvasMock.mock.calls[0]?.[0] as HTMLElement;
    expect(host.querySelector("[data-root-image]")).not.toBeNull();
    expect(addImageCalls).toHaveLength(1);
  });

  it("embeds web fonts and a placeholder so a failed image cannot hang", async () => {
    mountSlideDom("slide-1");

    await convertToPdf([makeScanResult()], [{ id: "slide-1", content: [] }]);

    expect(getFontEmbedCSSMock).toHaveBeenCalledTimes(1);
    const options = toCanvasMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(options.fontEmbedCSS).toBe("@font-face{font-family:Lora}");
    expect(options.imagePlaceholder).toMatch(/^data:image\//);
    expect(options.allowTaint).toBeUndefined();
    expect(options.pixelRatio).toBeGreaterThanOrEqual(1);
  });

  it("stamps the raster on the page and adds an invisible text layer", async () => {
    mountSlideDom("slide-1");

    await convertToPdf([makeScanResult()], [{ id: "slide-1", content: [] }]);

    expect(addImageCalls[0]).toEqual([
      RASTER_DATA_URL,
      "JPEG",
      0,
      0,
      10,
      5.625,
    ]);
    expect(textCalls).toHaveLength(1);
    expect(textCalls[0]?.text).toEqual(["Quarterly results"]);
    expect(textCalls[0]?.x).toBeCloseTo(1, 6);
    expect(textCalls[0]?.y).toBeCloseTo(1.125, 6);
    expect(textCalls[0]?.options.renderingMode).toBe("invisible");
  });

  it("removes the capture host from the document", async () => {
    mountSlideDom("slide-1");

    await convertToPdf([makeScanResult()], [{ id: "slide-1", content: [] }]);

    expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
  });

  it("skips a slide whose DOM is gone instead of aborting the export", async () => {
    mountSlideDom("slide-1");
    mountSlideDom("slide-3");

    await convertToPdf(
      [
        makeScanResult({ slideId: "slide-1" }),
        makeScanResult({ slideId: "slide-2" }),
        makeScanResult({ slideId: "slide-3" }),
      ],
      [
        { id: "slide-1", content: [] },
        { id: "slide-2", content: [] },
        { id: "slide-3", content: [] },
      ],
    );

    expect(toCanvasMock).toHaveBeenCalledTimes(2);
    expect(textCalls).toHaveLength(2);
    expect(addImageCalls).toHaveLength(2);
    // The middle slide gets its page back instead of shipping it blank.
    expect(addPageCalls).toHaveLength(2);
    expect(deletedPages).toEqual([2]);
  });

  it("skips a slide whose capture throws instead of aborting the export", async () => {
    mountSlideDom("slide-1");
    mountSlideDom("slide-2");
    mountSlideDom("slide-3");
    toCanvasMock
      .mockImplementationOnce(async () => ({
        toDataURL: () => RASTER_DATA_URL,
      }))
      .mockImplementationOnce(async () => {
        throw new Error("capture exploded");
      })
      .mockImplementation(async () => ({
        toDataURL: () => RASTER_DATA_URL,
      }));

    await expect(
      convertToPdf(
        [
          makeScanResult({ slideId: "slide-1" }),
          makeScanResult({ slideId: "slide-2" }),
          makeScanResult({ slideId: "slide-3" }),
        ],
        [
          { id: "slide-1", content: [] },
          { id: "slide-2", content: [] },
          { id: "slide-3", content: [] },
        ],
      ),
    ).resolves.toBeInstanceOf(ArrayBuffer);

    expect(textCalls).toHaveLength(2);
    expect(addImageCalls).toHaveLength(2);
    expect(deletedPages).toEqual([2]);
    // The failing slide's host must be torn down too: a leaked off-screen node
    // would corrupt every later slide and accumulate over a 40-slide deck.
    expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
  });

  it("never withdraws the first page, which a PDF cannot do without", async () => {
    // No slide is in the DOM at all: there is nothing to draw on any page.
    await convertToPdf([makeScanResult({ slideId: "slide-1" })], [
      { id: "slide-1", content: [] },
    ]);

    expect(deletedPages).toHaveLength(0);
    expect(addImageCalls).toHaveLength(0);
  });

  it("pairs slides by id, not by scan index", async () => {
    mountSlideDom("slide-2");

    // `scanAllSlides` drops slides it cannot find, so index 0 of the scan
    // results is not necessarily index 0 of the slide list.
    await convertToPdf(
      [makeScanResult({ slideId: "slide-2" })],
      [
        { id: "slide-1", content: [], isImageSlide: true, rootImage: { url: REMOTE_IMAGE } },
        { id: "slide-2", content: [] },
      ],
    );

    const host = toCanvasMock.mock.calls[0]?.[0] as HTMLElement;
    expect(host.textContent).toContain("Quarterly results");
    expect(addPageCalls).toHaveLength(0);
  });

  it("starts one page per rendered slide", async () => {
    mountSlideDom("slide-1");
    mountSlideDom("slide-2");
    mountSlideDom("slide-3");

    await convertToPdf(
      [
        makeScanResult({ slideId: "slide-1" }),
        makeScanResult({ slideId: "slide-2" }),
        makeScanResult({ slideId: "slide-3" }),
      ],
      [
        { id: "slide-1", content: [] },
        { id: "slide-2", content: [] },
        { id: "slide-3", content: [] },
      ],
    );

    // jsPDF starts with one page; every further slide adds exactly one more.
    expect(addPageCalls).toHaveLength(2);
    expect(addImageCalls).toHaveLength(3);
  });

  it("keeps image slides on the dedicated full-page image path", async () => {
    await convertToPdf(
      [makeScanResult()],
      [
        {
          id: "slide-1",
          content: [],
          isImageSlide: true,
          rootImage: { url: "https://cdn.example.com/root.png" },
        },
      ],
    );

    expect(toCanvasMock).not.toHaveBeenCalled();
    expect(addImageCalls).toHaveLength(1);
    expect(addImageCalls[0]?.[0]).toBe(INLINED_DATA_URL);
  });
});
