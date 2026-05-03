#!/usr/bin/env node
/**
 * Simple verification script to check that export modules exist and have correct structure
 */

import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

console.log("🔍 Verifying export modules...\n");

const pdfConverterPath = join(
  projectRoot,
  "src/components/presentation/export/domToPdfConverter.ts",
);
const pptxConverterPath = join(
  projectRoot,
  "src/components/presentation/export/domToPptxConverter.ts",
);
const exportButtonPath = join(
  projectRoot,
  "src/components/presentation/buttons/ExportButton.tsx",
);

let allGood = true;

// Check files exist
if (existsSync(pdfConverterPath)) {
  console.log("✅ PDF converter file exists");
} else {
  console.error("❌ PDF converter file missing");
  allGood = false;
}

if (existsSync(pptxConverterPath)) {
  console.log("✅ PPTX converter file exists");
} else {
  console.error("❌ PPTX converter file missing");
  allGood = false;
}

// Check function definitions
if (existsSync(pdfConverterPath)) {
  const pdfContent = readFileSync(pdfConverterPath, "utf-8");
  const pdfFunctions = [
    "convertToPdf",
    "exportPresentationToPdf",
    "downloadPdfBlob",
  ];

  for (const fn of pdfFunctions) {
    if (
      pdfContent.includes(`function ${fn}`) ||
      pdfContent.includes(`export function ${fn}`)
    ) {
      console.log(`  ✓ ${fn} defined in PDF converter`);
    } else {
      console.error(`  ✗ ${fn} NOT found in PDF converter`);
      allGood = false;
    }
  }
}

if (existsSync(pptxConverterPath)) {
  const pptxContent = readFileSync(pptxConverterPath, "utf-8");
  const pptxFunctions = [
    "convertToPptx",
    "exportPresentationToPptx",
    "downloadBlob",
  ];

  for (const fn of pptxFunctions) {
    if (
      pptxContent.includes(`function ${fn}`) ||
      pptxContent.includes(`export function ${fn}`)
    ) {
      console.log(`  ✓ ${fn} defined in PPTX converter`);
    } else {
      console.error(`  ✗ ${fn} NOT found in PPTX converter`);
      allGood = false;
    }
  }
}

// Check ExportButton imports both
if (existsSync(exportButtonPath)) {
  const buttonContent = readFileSync(exportButtonPath, "utf-8");
  if (
    buttonContent.includes("exportPresentationToPdf") &&
    buttonContent.includes("exportPresentationToPptx")
  ) {
    console.log("✅ ExportButton imports both PDF and PPTX exporters");
  } else {
    console.error("❌ ExportButton missing import for one or both exporters");
    allGood = false;
  }

  if (
    buttonContent.includes("downloadPdfBlob") &&
    buttonContent.includes("downloadBlob")
  ) {
    console.log("✅ ExportButton has both download functions");
  } else {
    console.error("❌ ExportButton missing download function");
    allGood = false;
  }

  if (buttonContent.includes("FileText")) {
    console.log("✅ ExportButton has PDF icon (FileText)");
  } else {
    console.error("❌ ExportButton missing PDF icon");
    allGood = false;
  }
}

console.log(
  "\n" + (allGood ? "✅ All checks passed!" : "❌ Some checks failed"),
);
process.exit(allGood ? 0 : 1);
