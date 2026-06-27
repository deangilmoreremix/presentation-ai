/**
 * Image Generation Templates by Category
 *
 * Comprehensive prompt template library covering all 15 Image Studio
 * categories. Each template includes a `promptPrefix`/`promptSuffix` to
 * wrap the user's prompt and `suggestedParams` to pre-fill the studio.
 *
 * `IMAGE_TEMPLATES` is exported as a flat array. Use `getTemplatesByCategory`
 * to filter, `getTemplate` to look up by id, and `applyTemplate` to wrap a
 * user prompt with prefix/suffix.
 */

import type {
  ImageTemplate,
  ImageCategory,
  ImageGenerationParams,
} from "./types";

const HIGH: ImageGenerationParams["quality"] = "high";
const MEDIUM: ImageGenerationParams["quality"] = "medium";

/* -------------------------------------------------------------------------- */
/*  Per-category templates                                                    */
/* -------------------------------------------------------------------------- */

const core: ImageTemplate[] = [
  {
    id: "core-photorealistic-portrait",
    category: "core",
    name: "Photorealistic Portrait",
    description: "Studio-quality, photo-realistic portrait of a person",
    emoji: "📸",
    promptPrefix: "Photorealistic studio portrait of ",
    promptSuffix:
      ", 85mm lens, soft Rembrandt lighting, sharp eyes, natural skin texture, 8K, editorial photography",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "core-cinematic-landscape",
    category: "core",
    name: "Cinematic Landscape",
    description: "Wide cinematic landscape with golden-hour atmosphere",
    emoji: "🌄",
    promptPrefix: "Cinematic landscape of ",
    promptSuffix:
      ", anamorphic widescreen, golden hour lighting, atmospheric haze, National Geographic style, ultra detailed",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "core-studio-product-shot",
    category: "core",
    name: "Studio Product Shot",
    description: "Clean commercial product on a seamless backdrop",
    emoji: "📦",
    promptPrefix: "Studio product photograph of ",
    promptSuffix:
      ", seamless white sweep background, soft box lighting, no shadows, sharp focus, e-commerce hero shot",
    suggestedParams: { background: "transparent", quality: HIGH },
  },
  {
    id: "core-abstract-concept",
    category: "core",
    name: "Abstract Concept",
    description: "Surreal abstract visualization of an idea",
    emoji: "🌀",
    promptPrefix: "Surreal abstract artwork visualizing the concept of ",
    promptSuffix:
      ", fluid shapes, vibrant gradient palette, dreamlike atmosphere, generative art, 8K",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "core-watercolor-illustration",
    category: "core",
    name: "Watercolor Illustration",
    description: "Hand-painted watercolor style scene",
    emoji: "🎨",
    promptSuffix:
      ", painted in soft watercolor style, paper texture, pastel palette, gentle brushstrokes, illustrative",
    suggestedParams: { quality: HIGH },
  },
];

const marketing: ImageTemplate[] = [
  {
    id: "marketing-hero-banner",
    category: "marketing",
    name: "Hero Banner",
    description: "Wide hero banner for a landing page",
    emoji: "🏔️",
    promptSuffix:
      ", hero banner composition, wide 16:9, generous negative space for headline overlay, modern brand aesthetic",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "marketing-social-media-ad",
    category: "marketing",
    name: "Social Media Ad",
    description: "Square social ad creative with bold focal point",
    emoji: "📱",
    promptSuffix:
      ", square social ad, bold focal subject, vibrant brand colors, scroll-stopping composition, conversion-focused",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "marketing-email-header",
    category: "marketing",
    name: "Email Header",
    description: "Wide, on-brand header image for email campaigns",
    emoji: "📧",
    promptSuffix:
      ", email header image, ultra-wide banner, soft brand palette, text-safe negative space, polished marketing look",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "marketing-promotional-poster",
    category: "marketing",
    name: "Promotional Poster",
    description: "Print-ready event/promo poster",
    emoji: "🪧",
    promptSuffix:
      ", promotional poster design, bold headline area, event branding, eye-catching layout, print-ready",
    suggestedParams: { size: "1024x1536", quality: HIGH },
  },
];

const branding: ImageTemplate[] = [
  {
    id: "branding-logo-concept",
    category: "branding",
    name: "Logo Concept",
    description: "Modern, minimalist logo mark on a transparent background",
    emoji: "🔣",
    promptSuffix:
      ", minimalist logo mark, vector-style, clean geometry, balanced negative space, transparent background, scalable",
    suggestedParams: { background: "transparent", quality: HIGH },
  },
  {
    id: "branding-app-icon",
    category: "branding",
    name: "App Icon",
    description: "iOS/Android-ready square app icon",
    emoji: "📱",
    promptSuffix:
      ", square app icon, rounded corners, single bold symbol, gradient background, iOS/Android ready, 1024x1024",
    suggestedParams: { size: "1024x1024", background: "transparent", quality: HIGH },
  },
  {
    id: "branding-color-palette",
    category: "branding",
    name: "Color Palette Visual",
    description: "Curated brand color palette visualization",
    emoji: "🎨",
    promptSuffix:
      ", brand color palette swatches, harmonious gradient arrangement, modern brand identity mood board",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "branding-business-card",
    category: "branding",
    name: "Business Card",
    description: "Mock business card layout",
    emoji: "💳",
    promptSuffix:
      ", business card mockup, modern typography, contact details area, professional print layout, premium paper feel",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
];

const product: ImageTemplate[] = [
  {
    id: "product-amazon-listing",
    category: "product",
    name: "Amazon Listing",
    description: "E-commerce-ready product on pure white",
    emoji: "🛒",
    promptSuffix:
      ", Amazon main image style, pure white background, no text, sharp focus, high-contrast, listing-ready",
    suggestedParams: { background: "transparent", quality: HIGH },
  },
  {
    id: "product-lifestyle-shot",
    category: "product",
    name: "Lifestyle Shot",
    description: "Product shown in real-world lifestyle context",
    emoji: "🛋️",
    promptSuffix:
      ", lifestyle product photography, contextual environment, warm natural light, aspirational mood",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "product-packaging",
    category: "product",
    name: "Packaging Mockup",
    description: "3D product packaging render",
    emoji: "📦",
    promptSuffix:
      ", photorealistic packaging mockup, front three-quarter view, shelf-ready, clean studio lighting",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "product-flat-lay",
    category: "product",
    name: "Flat Lay",
    description: "Overhead product flat lay composition",
    emoji: "🍱",
    promptSuffix:
      ", overhead flat lay composition, soft shadows, pastel surfaces, balanced arrangement, editorial style",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
];

const content: ImageTemplate[] = [
  {
    id: "content-youtube-thumbnail",
    category: "content",
    name: "YouTube Thumbnail",
    description: "High-CTR YouTube thumbnail",
    emoji: "▶️",
    promptSuffix:
      ", YouTube thumbnail, expressive face area, bold contrast, 16:9, leave space for text overlay, click-worthy",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "content-blog-cover",
    category: "content",
    name: "Blog Cover",
    description: "Wide blog/article header image",
    emoji: "📰",
    promptSuffix:
      ", blog header image, text-safe negative space, modern editorial style, balanced composition",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "content-podcast-cover",
    category: "content",
    name: "Podcast Cover Art",
    description: "Square podcast cover artwork",
    emoji: "🎙️",
    promptSuffix:
      ", square podcast cover art, bold typography area, music theme, 3000x3000 look, recognizable at small sizes",
    suggestedParams: { size: "1024x1024", quality: HIGH },
  },
  {
    id: "content-newsletter-graphic",
    category: "content",
    name: "Newsletter Graphic",
    description: "Inline newsletter illustration",
    emoji: "📨",
    promptSuffix:
      ", inline newsletter graphic, friendly illustration, brand-friendly palette, clear focal point",
    suggestedParams: { quality: HIGH },
  },
];

const editing: ImageTemplate[] = [
  {
    id: "editing-background-removal",
    category: "editing",
    name: "Background Removal",
    description: "Cut out the subject onto a transparent background",
    emoji: "✂️",
    promptSuffix:
      ", isolate subject on transparent background, precise edge masking, no halo, alpha channel preserved",
    suggestedParams: { background: "transparent", quality: HIGH, inputFidelity: "high" },
    requiresEdit: true,
  },
  {
    id: "editing-style-transfer",
    category: "editing",
    name: "Style Transfer",
    description: "Re-render an image in a new artistic style",
    emoji: "🎭",
    promptSuffix:
      ", reinterpret this image in the requested style, preserve composition and subjects, refined artistic finish",
    suggestedParams: { quality: HIGH, inputFidelity: "high" },
    requiresEdit: true,
  },
  {
    id: "editing-color-grading",
    category: "editing",
    name: "Color Grading",
    description: "Apply cinematic color grade to an image",
    emoji: "🎞️",
    promptSuffix:
      ", apply cinematic color grading, balanced contrast, cohesive palette, professional colorist look",
    suggestedParams: { quality: HIGH, inputFidelity: "high" },
    requiresEdit: true,
  },
  {
    id: "editing-object-removal",
    category: "editing",
    name: "Object Removal",
    description: "Seamlessly remove an object from an image",
    emoji: "🧽",
    promptSuffix:
      ", remove the specified object cleanly, inpaint the area, match surrounding texture and lighting seamlessly",
    suggestedParams: { quality: HIGH, inputFidelity: "high" },
    requiresEdit: true,
  },
];

const composition: ImageTemplate[] = [
  {
    id: "composition-inpaint",
    category: "composition",
    name: "Inpainting",
    description: "Edit only the masked region of an image",
    emoji: "🖌️",
    promptSuffix:
      ", edit only the masked region, seamless integration with the rest of the image, natural blend",
    suggestedParams: { quality: HIGH, inputFidelity: "high" },
    requiresEdit: true,
  },
  {
    id: "composition-outpaint",
    category: "composition",
    name: "Outpainting",
    description: "Extend an image beyond its original borders",
    emoji: "🖼️",
    promptSuffix:
      ", extend the image beyond its original borders, seamless continuation, consistent perspective and lighting",
    suggestedParams: { size: "1536x1024", quality: HIGH, inputFidelity: "high" },
    requiresEdit: true,
  },
  {
    id: "composition-scene-expansion",
    category: "composition",
    name: "Scene Expansion",
    description: "Widen the camera angle / expand the scene",
    emoji: "🎬",
    promptSuffix:
      ", widen the camera angle, expand the scene, cinematic expansion, consistent visual language with the original",
    suggestedParams: { size: "1536x1024", quality: HIGH, inputFidelity: "high" },
    requiresEdit: true,
  },
  {
    id: "composition-multi-image-blend",
    category: "composition",
    name: "Multi-Image Blend",
    description: "Combine multiple input images into one scene",
    emoji: "🧩",
    promptSuffix:
      ", combine the provided reference images into a single coherent scene, harmonize lighting and perspective",
    suggestedParams: { quality: HIGH, inputFidelity: "high" },
    requiresEdit: true,
    supportsMultiImage: true,
  },
];

const consistency: ImageTemplate[] = [
  {
    id: "consistency-character-series",
    category: "consistency",
    name: "Character Series",
    description: "Same character across multiple images",
    emoji: "🧍",
    promptSuffix:
      ", preserve the character's face, clothing and style from the reference, consistent character across scenes",
    suggestedParams: { quality: HIGH, inputFidelity: "high" },
    requiresEdit: true,
    supportsMultiImage: true,
  },
  {
    id: "consistency-brand-series",
    category: "consistency",
    name: "Brand Series",
    description: "Maintain brand identity across variations",
    emoji: "🏷️",
    promptSuffix:
      ", maintain brand colors, typography style and visual language from the reference assets",
    suggestedParams: { quality: HIGH, inputFidelity: "high" },
    requiresEdit: true,
    supportsMultiImage: true,
  },
  {
    id: "consistency-style-variations",
    category: "consistency",
    name: "Style Variations",
    description: "Multiple variations with a unified style",
    emoji: "🧪",
    promptSuffix:
      ", keep a consistent artistic style, vary the subject or composition, cohesive set of images",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "consistency-product-lineup",
    category: "consistency",
    name: "Product Lineup",
    description: "Multiple products in a consistent family",
    emoji: "🧴",
    promptSuffix:
      ", product family lineup, consistent lighting, angle and background, retail-ready collection",
    suggestedParams: { quality: HIGH, inputFidelity: "high" },
    requiresEdit: true,
    supportsMultiImage: true,
  },
];

const uiUx: ImageTemplate[] = [
  {
    id: "uiux-website-mockup",
    category: "ui-ux",
    name: "Website Mockup",
    description: "Modern website hero / landing page mockup",
    emoji: "💻",
    promptSuffix:
      ", modern website mockup, clean UI, balanced typography, desktop hero section, realistic shadows",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "uiux-mobile-app-screen",
    category: "ui-ux",
    name: "Mobile App Screen",
    description: "Mobile app interface mockup",
    emoji: "📱",
    promptSuffix:
      ", mobile app UI, iOS/Android screen mockup, modern design system, clean iconography, realistic device frame",
    suggestedParams: { size: "1024x1536", quality: HIGH },
  },
  {
    id: "uiux-dashboard",
    category: "ui-ux",
    name: "Dashboard",
    description: "Analytics / admin dashboard mockup",
    emoji: "📊",
    promptSuffix:
      ", dashboard UI mockup, charts, KPIs, clean data visualization, modern admin panel layout",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "uiux-design-system",
    category: "ui-ux",
    name: "Design System",
    description: "Visual design system / component library showcase",
    emoji: "🧱",
    promptSuffix:
      ", design system showcase, component grid, typography scale, color tokens, UI kit overview",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
];

const educational: ImageTemplate[] = [
  {
    id: "educational-infographic",
    category: "educational",
    name: "Infographic",
    description: "Educational infographic with charts",
    emoji: "📊",
    promptSuffix:
      ", infographic layout, charts, icons, clear information hierarchy, engaging educational design",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "educational-flowchart",
    category: "educational",
    name: "Flowchart",
    description: "Process / system flowchart",
    emoji: "🗂️",
    promptSuffix:
      ", process flowchart, clear steps and connectors, professional diagram, easy to follow, instructional",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "educational-illustration",
    category: "educational",
    name: "Educational Illustration",
    description: "Teaching-friendly illustration",
    emoji: "🧑‍🏫",
    promptSuffix:
      ", educational illustration, clear labels area, friendly style, student-friendly visual",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "educational-anatomy-diagram",
    category: "educational",
    name: "Anatomy Diagram",
    description: "Labeled anatomy / scientific diagram",
    emoji: "🧬",
    promptSuffix:
      ", labeled anatomy diagram, scientific accuracy, clean lines, textbook illustration style",
    suggestedParams: { quality: HIGH },
  },
];

const storytelling: ImageTemplate[] = [
  {
    id: "storytelling-storyboard",
    category: "storytelling",
    name: "Storyboard Panel",
    description: "Single film / animation storyboard panel",
    emoji: "🎞️",
    promptSuffix:
      ", film storyboard panel, cinematic framing, shot composition, clear action, directors notes area",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "storytelling-comic-panel",
    category: "storytelling",
    name: "Comic Panel",
    description: "Comic book panel with action and style",
    emoji: "💥",
    promptSuffix:
      ", comic book panel, bold inks, dynamic composition, halftone shading, speech bubble space",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "storytelling-character-sheet",
    category: "storytelling",
    name: "Character Sheet",
    description: "Character design reference sheet",
    emoji: "🧑‍🎨",
    promptSuffix:
      ", character reference sheet, multiple poses and expressions, turnaround view, design notes",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "storytelling-book-cover",
    category: "storytelling",
    name: "Book Cover",
    description: "Fiction / non-fiction book cover",
    emoji: "📚",
    promptSuffix:
      ", book cover design, bold title area, evocative scene, genre-appropriate typography",
    suggestedParams: { size: "1024x1536", quality: HIGH },
  },
];

const realEstate: ImageTemplate[] = [
  {
    id: "realestate-interior-render",
    category: "real-estate",
    name: "Interior Render",
    description: "Architectural interior visualization",
    emoji: "🛋️",
    promptSuffix:
      ", interior design render, architectural visualization, staged room, real-estate listing quality",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "realestate-exterior-render",
    category: "real-estate",
    name: "Exterior Render",
    description: "Architectural exterior of a building",
    emoji: "🏡",
    promptSuffix:
      ", exterior architectural rendering, golden hour, landscaping, real-estate marketing photo style",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "realestate-virtual-staging",
    category: "real-estate",
    name: "Virtual Staging",
    description: "Virtually stage an empty room",
    emoji: "🪑",
    promptSuffix:
      ", virtually stage this empty room with tasteful furniture, neutral palette, photorealistic lighting",
    suggestedParams: { quality: HIGH, inputFidelity: "high" },
    requiresEdit: true,
  },
  {
    id: "realestate-floor-plan-visual",
    category: "real-estate",
    name: "Floor Plan Visual",
    description: "Stylized 3D floor plan illustration",
    emoji: "📐",
    promptSuffix:
      ", stylized 3D floor plan illustration, top-down with slight perspective, furniture, soft shadows",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
];

const fashion: ImageTemplate[] = [
  {
    id: "fashion-lookbook",
    category: "fashion",
    name: "Fashion Lookbook",
    description: "Editorial fashion lookbook image",
    emoji: "👗",
    promptSuffix:
      ", fashion lookbook, editorial style, studio lighting, model in motion, magazine-quality",
    suggestedParams: { size: "1024x1536", quality: HIGH },
  },
  {
    id: "fashion-street-style",
    category: "fashion",
    name: "Street Style",
    description: "Candid street-style fashion shot",
    emoji: "🕶️",
    promptSuffix:
      ", candid street-style fashion photo, urban backdrop, natural light, editorial composition",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "fashion-beauty-campaign",
    category: "fashion",
    name: "Beauty Campaign",
    description: "Cosmetics / skincare beauty campaign",
    emoji: "💄",
    promptSuffix:
      ", beauty campaign visual, close-up, soft glowing skin, cosmetic product area, glamorous lighting",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "fashion-look-collage",
    category: "fashion",
    name: "Outfit Collage",
    description: "Flat-lay outfit composition",
    emoji: "👚",
    promptSuffix:
      ", flat-lay outfit collage, coordinated accessories, soft pastel background, editorial composition",
    suggestedParams: { size: "1024x1024", quality: HIGH },
  },
];

const automation: ImageTemplate[] = [
  {
    id: "automation-pipeline",
    category: "automation",
    name: "Pipeline Diagram",
    description: "Visualize an AI image pipeline",
    emoji: "🔁",
    promptSuffix:
      ", AI image pipeline diagram, stages and arrows, automation workflow, clean technical illustration",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "automation-ab-variants",
    category: "automation",
    name: "A/B Test Variants",
    description: "Generate variants for A/B testing",
    emoji: "🆎",
    promptSuffix:
      ", A/B testing variant set, same brief different executions, comparison layout",
    suggestedParams: { quality: MEDIUM, n: 4 },
  },
  {
    id: "automation-bulk-batch",
    category: "automation",
    name: "Bulk Batch",
    description: "Generate many variations in a single batch",
    emoji: "📦",
    promptSuffix:
      ", bulk creative batch, many variations, scalable creative production",
    suggestedParams: { quality: MEDIUM, n: 4 },
  },
  {
    id: "automation-template-grid",
    category: "automation",
    name: "Template Grid",
    description: "Grid layout of generated images",
    emoji: "🗂️",
    promptSuffix:
      ", grid of generated images, consistent style, automation-friendly output",
    suggestedParams: { quality: MEDIUM, n: 4 },
  },
];

const saasProducts: ImageTemplate[] = [
  {
    id: "saas-thumbnail-generator",
    category: "saas-products",
    name: "AI Thumbnail Generator",
    description: "SaaS-ready thumbnail output",
    emoji: "🖼️",
    promptSuffix:
      ", viral-style thumbnail, bold focal subject, CTR-optimized layout",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "saas-ad-creative-engine",
    category: "saas-products",
    name: "Ad Creative Engine",
    description: "Multi-platform ad creative",
    emoji: "🚀",
    promptSuffix:
      ", multi-platform ad creative, conversion-optimized, brand-aligned, professional marketing output",
    suggestedParams: { quality: HIGH },
  },
  {
    id: "saas-storyboard-builder",
    category: "saas-products",
    name: "Storyboard Builder",
    description: "Auto-generated storyboard sequence",
    emoji: "🎬",
    promptSuffix:
      ", automated storyboard sequence, scene breakdown, narrative flow, professional panels",
    suggestedParams: { size: "1536x1024", quality: HIGH },
  },
  {
    id: "saas-social-media-engine",
    category: "saas-products",
    name: "Social Media Engine",
    description: "Scalable social content",
    emoji: "📲",
    promptSuffix:
      ", scalable social content, on-brand carousel layout, shareable visual, consistent identity",
    suggestedParams: { quality: HIGH },
  },
];

/* -------------------------------------------------------------------------- */
/*  Exports                                                                   */
/* -------------------------------------------------------------------------- */

export const IMAGE_TEMPLATES: ImageTemplate[] = [
  ...core,
  ...marketing,
  ...branding,
  ...product,
  ...content,
  ...editing,
  ...composition,
  ...consistency,
  ...uiUx,
  ...educational,
  ...storytelling,
  ...realEstate,
  ...fashion,
  ...automation,
  ...saasProducts,
];

/**
 * Templates grouped by category, derived from IMAGE_TEMPLATES.
 * Provided for consumers that previously used a Record-based structure.
 */
export const IMAGE_TEMPLATES_BY_CATEGORY: Record<ImageCategory, ImageTemplate[]> = {
  core,
  marketing,
  branding,
  product,
  content,
  editing,
  composition,
  consistency,
  "ui-ux": uiUx,
  educational,
  storytelling,
  "real-estate": realEstate,
  fashion,
  automation,
  "saas-products": saasProducts,
};

/** Lookup a template by its id. */
export function getTemplateById(id: string): ImageTemplate | undefined {
  return IMAGE_TEMPLATES.find((t) => t.id === id);
}

/** Backwards-compatible lookup by (category, id). */
export function getTemplate(
  category: ImageCategory,
  templateId: string,
): ImageTemplate | undefined {
  return IMAGE_TEMPLATES_BY_CATEGORY[category]?.find((t) => t.id === templateId);
}

/** Return all templates for a category. */
export function getTemplatesByCategory(category: ImageCategory): ImageTemplate[] {
  return IMAGE_TEMPLATES_BY_CATEGORY[category] ?? [];
}

/**
 * Apply a template's prefix/suffix to a user-supplied prompt and return the
 * resulting params (prompt + suggested defaults).
 */
export function applyTemplate(
  category: ImageCategory,
  templateId: string,
  userPrompt: string,
): { prompt: string; params?: Partial<ImageGenerationParams> } {
  const template = getTemplate(category, templateId);
  if (!template) {
    return { prompt: userPrompt };
  }
  const prompt = `${template.promptPrefix ?? ""}${userPrompt}${template.promptSuffix ?? ""}`;
  return { prompt, params: template.suggestedParams };
}