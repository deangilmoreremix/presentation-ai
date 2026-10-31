#!/usr/bin/env node
/**
 * Refresh the bundled Free PPT Templates catalog from
 * https://github.com/deangilmoreremix/free-ppt-template (CC BY 4.0).
 *
 * Usage:
 *   pnpm templates:sync                 # fetch index.json from GitHub
 *   pnpm templates:sync ./index.json    # use a local copy
 *
 * Writes a compact snapshot to src/data/free-ppt-templates.json. Preview and
 * .pptx URLs are derived from the slug at runtime (see
 * src/lib/presentation/free-ppt-templates.ts), so they aren't stored here.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://raw.githubusercontent.com/deangilmoreremix/free-ppt-template/main/index.json";
const CDN_BASE = "https://cdn.ppttemplate.ai/templates";
const NOISE_TAGS = new Set(["powerpoint template", "google slides"]);

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outFile = path.join(root, "src/data/free-ppt-templates.json");

async function loadIndex(source) {
  if (source) return JSON.parse(await readFile(source, "utf8"));
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`GET ${SOURCE_URL} → ${res.status}`);
  return res.json();
}

const index = await loadIndex(process.argv[2]);

const templates = index.map((t) => {
  const base = `${CDN_BASE}/${t.slug}/v3/`;
  if (t.cover !== `${base}00.jpg` || t.pptx_url !== `${base}${t.slug}.pptx`) {
    throw new Error(`Unexpected CDN layout for ${t.slug}; update the loader.`);
  }
  return {
    slug: t.slug,
    title: t.title,
    description: t.description,
    category: t.category,
    categoryName: t.category_name,
    type: t.template_type,
    slideCount: t.preview_urls.length,
    tags: t.tags.filter((tag) => !NOISE_TAGS.has(tag.toLowerCase())),
    colors: t.colors,
  };
});

templates.sort((a, b) => a.title.localeCompare(b.title));
await writeFile(outFile, `${JSON.stringify(templates)}\n`);
console.log(`Wrote ${templates.length} templates to ${path.relative(root, outFile)}`);
