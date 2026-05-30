/**
 * Image Generation Templates by Category
 * Pre-defined prompts for the 15 image categories
 */

import type { ImageTemplate, ImageCategory, ImageGenerationParams } from "./types";

export const IMAGE_TEMPLATES: Record<ImageCategory, ImageTemplate[]> = {
  core: [
    {
      id: "text-to-image",
      category: "core",
      name: "Text to Image",
      description: "Transform any text description into a visual image",
      promptPrefix: "Create a highly detailed, visually stunning image of: ",
    },
    {
      id: "photorealistic",
      category: "core",
      name: "Photorealistic",
      description: "Create realistic photography-style images",
      promptPrefix: "Photorealistic image of ",
      promptSuffix: ", professional photography, 8K resolution, sharp focus, natural lighting, realistic details",
      suggestedParams: { quality: "high" },
    },
    {
      id: "illustration",
      category: "core",
      name: "Illustration",
      description: "Create artistic illustrations and drawings",
      promptPrefix: "Beautiful illustration of ",
      promptSuffix: ", digital art, vibrant colors, artistic style, high detail, creative composition",
      suggestedParams: { quality: "high" },
    },
    {
      id: "concept-art",
      category: "core",
      name: "Concept Art",
      description: "Create concept art for games, movies, and creative projects",
      promptPrefix: "Concept art of ",
      promptSuffix: ", fantasy art style, digital painting, cinematic lighting, highly detailed, professional concept art",
      suggestedParams: { quality: "high" },
    },
    {
      id: "character",
      category: "core",
      name: "Character Creation",
      description: "Generate original characters for stories, games, or branding",
      promptPrefix: "Original character design of ",
      promptSuffix: ", character concept art, detailed facial features, expressive, full body view, digital illustration",
      suggestedParams: { size: "1024x1536" },
    },
  ],

  marketing: [
    {
      id: "social-post",
      category: "marketing",
      name: "Social Media Post",
      description: "Create engaging social media content",
      promptSuffix: ", bold typography, vibrant colors, social media aesthetic, Instagram style, eye-catching design",
      suggestedParams: { quality: "high" },
    },
    {
      id: "facebook-ad",
      category: "marketing",
      name: "Facebook Ad Creative",
      description: "Professional Facebook advertisement visuals",
      promptSuffix: ", Facebook ad format, clean layout, compelling visual, call-to-action button, professional marketing design",
      suggestedParams: { quality: "high" },
    },
    {
      id: "instagram-ad",
      category: "marketing",
      name: "Instagram Ad Creative",
      description: "Vertical Instagram ad creatives",
      promptSuffix: ", Instagram story ad format, vertical 9:16 aspect, bold text overlay, modern aesthetic, swipe-up design",
      suggestedParams: { size: "1024x1536", quality: "high" },
    },
    {
      id: "google-display-ad",
      category: "marketing",
      name: "Google Display Ad",
      description: "Web banner advertisements",
      promptSuffix: ", Google display ad format, horizontal banner, clean professional design, minimal text, brand-friendly",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
    {
      id: "promotional-poster",
      category: "marketing",
      name: "Promotional Poster",
      description: "Event and product promotion posters",
      promptSuffix: ", promotional poster design, bold headline, event announcement, professional print layout, vibrant colors",
      suggestedParams: { quality: "high" },
    },
  ],

  branding: [
    {
      id: "logo-concept",
      category: "branding",
      name: "Logo Concept",
      description: "Generate logo design concepts",
      promptSuffix: ", minimalist logo design, vector style, clean typography, brand identity, scalable logo, professional",
      suggestedParams: { background: "transparent", quality: "high" },
    },
    {
      id: "brand-identity",
      category: "branding",
      name: "Brand Identity Visual",
      description: "Complete brand identity mockups",
      promptSuffix: ", brand identity kit, color palette, business cards, letterhead, cohesive brand design, professional branding",
      suggestedParams: { quality: "high" },
    },
    {
      id: "app-icon",
      category: "branding",
      name: "App Icon",
      description: "Mobile and web application icons",
      promptSuffix: ", app icon design, iOS/Android style, simple recognizable symbol, gradient background, modern icon design",
      suggestedParams: { size: "1024x1024", background: "transparent" },
    },
    {
      id: "business-card",
      category: "branding",
      name: "Business Card Design",
      description: "Professional business card layouts",
      promptSuffix: ", business card design, professional layout, QR code, contact information, modern business card style",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
  ],

  product: [
    {
      id: "product-mockup",
      category: "product",
      name: "Product Mockup",
      description: "Showcase products in realistic settings",
      promptSuffix: ", product mockup, lifestyle setting, professional product photography, clean white background, studio lighting",
      suggestedParams: { quality: "high" },
    },
    {
      id: "amazon-listing",
      category: "product",
      name: "Amazon Listing Image",
      description: "E-commerce ready product images",
      promptSuffix: ", Amazon product listing image, white background, professional lighting, clean presentation, e-commerce style",
      suggestedParams: { quality: "high" },
    },
    {
      id: "packaging-design",
      category: "product",
      name: "Packaging Design",
      description: "Product packaging mockups",
      promptSuffix: ", product packaging design, front view, branding elements, shelf-ready, professional packaging mockup",
      suggestedParams: { quality: "high" },
    },
    {
      id: "before-after",
      category: "product",
      name: "Before/After Product",
      description: "Show product transformations",
      promptSuffix: ", before and after comparison, split screen, product transformation, clear visual difference, professional layout",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
  ],

  content: [
    {
      id: "youtube-thumbnail",
      category: "content",
      name: "YouTube Thumbnail",
      description: "Click-worthy video thumbnails",
      promptSuffix: ", YouTube thumbnail design, bold text, expressive face, high contrast, 16:9 aspect, click-worthy design",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
    {
      id: "blog-cover",
      category: "content",
      name: "Blog Cover Image",
      description: "Article and blog header images",
      promptSuffix: ", blog header image, professional blog design, text overlay friendly, clean aesthetic, reading-friendly image",
      suggestedParams: { quality: "high" },
    },
    {
      id: "podcast-cover",
      category: "content",
      name: "Podcast Cover Art",
      description: "Podcast cover and branding",
      promptSuffix: ", podcast cover art, square format, bold typography, music theme, professional podcast branding",
      suggestedParams: { quality: "high" },
    },
    {
      id: "course-thumbnail",
      category: "content",
      name: "Course Thumbnail",
      description: "Online course promotional images",
      promptSuffix: ", online course thumbnail, educational theme, text overlay space, engaging design, learning-focused visual",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
  ],

  editing: [
    {
      id: "background-remove",
      category: "editing",
      name: "Background Removal",
      description: "Remove backgrounds from existing images",
      promptSuffix: ", remove background, clean cutout, transparent background, professional masking, precise edges",
      suggestedParams: { background: "transparent", quality: "high" },
    },
    {
      id: "background-replace",
      category: "editing",
      name: "Background Replacement",
      description: "Replace backgrounds in images",
      promptSuffix: ", replace background with, seamless blend, professional compositing, realistic integration, studio quality",
      suggestedParams: { quality: "high" },
    },
    {
      id: "object-remove",
      category: "editing",
      name: "Object Removal",
      description: "Remove unwanted objects cleanly",
      promptSuffix: ", remove object seamlessly, content-aware fill, professional cleanup, invisible removal, clean result",
      suggestedParams: { quality: "high" },
    },
  ],

  composition: [
    {
      id: "inpaint",
      category: "composition",
      name: "Inpainting",
      description: "Edit specific areas within images",
      promptSuffix: ", edit specific area, seamless integration, content-aware modification, professional touch-up, natural blend",
      suggestedParams: { quality: "high" },
    },
    {
      id: "outpaint",
      category: "composition",
      name: "Outpainting",
      description: "Extend images beyond original boundaries",
      promptSuffix: ", extend image beyond borders, seamless extension, creative continuation, expanded canvas, artistic outpainting",
      suggestedParams: { quality: "high" },
    },
    {
      id: "scene-expansion",
      category: "composition",
      name: "Scene Expansion",
      description: "Widen or expand the scene view",
      promptSuffix: ", expand the scene, wider angle view, additional environment, cinematic expansion, panoramic feel",
      suggestedParams: { quality: "high" },
    },
  ],

  consistency: [
    {
      id: "character-series",
      category: "consistency",
      name: "Character Consistency",
      description: "Maintain character appearance across images",
      promptSuffix: ", same character as reference, consistent appearance, maintain style, character continuity, uniform design",
      suggestedParams: { quality: "high" },
    },
    {
      id: "brand-series",
      category: "consistency",
      name: "Brand Consistency",
      description: "Keep branding consistent across visuals",
      promptSuffix: ", consistent with brand colors, maintain typography, brand guidelines adherence, uniform visual identity",
      suggestedParams: { quality: "high" },
    },
    {
      id: "style-variations",
      category: "consistency",
      name: "Style Variations",
      description: "Multiple versions with consistent style",
      promptSuffix: ", maintain consistent style, multiple variations, same artistic approach, uniform aesthetic, coherent design",
      suggestedParams: { quality: "high" },
    },
  ],

  "ui-ux": [
    {
      id: "website-mockup",
      category: "ui-ux",
      name: "Website Mockup",
      description: "Website design concepts and layouts",
      promptSuffix: ", website mockup, clean UI design, modern web layout, responsive design, user interface concept",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
    {
      id: "mobile-ui",
      category: "ui-ux",
      name: "Mobile UI Mockup",
      description: "Mobile app interface designs",
      promptSuffix: ", mobile app UI design, iOS/Android interface, clean screens, modern mobile design, user-friendly layout",
      suggestedParams: { size: "1024x1536", quality: "high" },
    },
    {
      id: "dashboard-design",
      category: "ui-ux",
      name: "Dashboard Design",
      description: "Admin and analytics dashboard visuals",
      promptSuffix: ", dashboard design, analytics charts, clean data visualization, professional admin UI, modern dashboard layout",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
  ],

  educational: [
    {
      id: "infographic",
      category: "educational",
      name: "Infographic",
      description: "Data visualization and infographics",
      promptSuffix: ", infographic design, data visualization, charts and graphs, educational content, clear information hierarchy",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
    {
      id: "diagram",
      category: "educational",
      name: "Process Diagram",
      description: "Process flows and system diagrams",
      promptSuffix: ", process diagram, flowchart style, clear steps, professional diagram, educational infographic",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
    {
      id: "educational-illustration",
      category: "educational",
      name: "Educational Illustration",
      description: "Teaching and learning visuals",
      promptSuffix: ", educational illustration, teaching diagram, clear learning visual, student-friendly, informative design",
      suggestedParams: { quality: "high" },
    },
  ],

  storytelling: [
    {
      id: "storyboard",
      category: "storytelling",
      name: "Storyboard",
      description: "Video and animation storyboards",
      promptSuffix: ", storyboard panel, shot composition, cinematic framing, scene planning, film storyboard style",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
    {
      id: "comic-panel",
      category: "storytelling",
      name: "Comic Panel",
      description: "Comic book style illustrations",
      promptSuffix: ", comic book panel, action scene, bold lines, speech bubble, dynamic composition, comic art style",
      suggestedParams: { quality: "high" },
    },
    {
      id: "character-sheet",
      category: "storytelling",
      name: "Character Sheet",
      description: "Character design reference sheets",
      promptSuffix: ", character reference sheet, multiple poses, detailed expression chart, turn-around view, character design sheet",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
  ],

  "real-estate": [
    {
      id: "interior-design",
      category: "real-estate",
      name: "Interior Design Render",
      description: "Room and interior visualizations",
      promptSuffix: ", interior design render, architectural visualization, modern furniture, real estate listing style, staged room",
      suggestedParams: { quality: "high" },
    },
    {
      id: "exterior-building",
      category: "real-estate",
      name: "Exterior Building",
      description: "Building and property exteriors",
      promptSuffix: ", exterior building visualization, architectural rendering, professional real estate photo, property listing",
      suggestedParams: { quality: "high" },
    },
    {
      id: "before-after-renovation",
      category: "real-estate",
      name: "Renovation Before/After",
      description: "Show property transformations",
      promptSuffix: ", before and after renovation, property transformation, remodeling comparison, real estate upgrade visual",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
  ],

  fashion: [
    {
      id: "outfit-generation",
      category: "fashion",
      name: "Outfit Generation",
      description: "Fashion and style outfit concepts",
      promptSuffix: ", fashion outfit, model wearing clothes, runway style, high-fashion photography, stylish composition",
      suggestedParams: { quality: "high" },
    },
    {
      id: "fashion-lookbook",
      category: "fashion",
      name: "Fashion Lookbook",
      description: "Professional fashion lookbooks",
      promptSuffix: ", fashion lookbook, editorial style, professional model, studio photography, clothing showcase",
      suggestedParams: { quality: "high" },
    },
    {
      id: "beauty-campaign",
      category: "fashion",
      name: "Beauty Campaign",
      description: "Cosmetics and beauty advertising",
      promptSuffix: ", beauty campaign visual, makeup close-up, glamorous lighting, cosmetics advertisement, editorial beauty shot",
      suggestedParams: { quality: "high" },
    },
  ],

  automation: [
    {
      id: "multi-step-pipeline",
      category: "automation",
      name: "Multi-step Pipeline",
      description: "Automated image generation workflows",
      promptSuffix: ", automated creative pipeline, multi-step process, iterative refinement, AI workflow visualization",
      suggestedParams: { quality: "high" },
    },
    {
      id: "a-b-testing",
      category: "automation",
      name: "A/B Testing Variants",
      description: "Multiple image variations for testing",
      promptSuffix: ", A/B testing variant, alternative design, multiple options, split testing visual, comparison layout",
      suggestedParams: { quality: "high", n: 4 },
    },
    {
      id: "bulk-generation",
      category: "automation",
      name: "Bulk Generation",
      description: "Generate multiple images at scale",
      promptSuffix: ", bulk generation batch, multiple variations, scalable creative, automated production",
      suggestedParams: { quality: "medium", n: 4 },
    },
  ],

  "saas-products": [
    {
      id: "ai-thumbnail-generator",
      category: "saas-products",
      name: "AI Thumbnail Generator",
      description: "SaaS-ready thumbnail creation",
      promptSuffix: ", YouTube short thumbnail, viral style, bold text, high CTR design, click-worthy thumbnail",
      suggestedParams: { size: "1536x1024", quality: "high" },
    },
    {
      id: "ai-ad-creative",
      category: "saas-products",
      name: "AI Ad Creative Engine",
      description: "Complete ad creative generation",
      promptSuffix: ", professional ad creative, multi-platform design, conversion optimized, brand-aligned advertisement",
      suggestedParams: { quality: "high" },
    },
    {
      id: "ai-storyboard-builder",
      category: "saas-products",
      name: "AI Storyboard Builder",
      description: "Automated storyboard creation",
      promptSuffix: ", storyboard sequence, scene breakdown, visual narrative, automated storyboarding, professional panels",
      suggestedParams: { quality: "high" },
    },
    {
      id: "ai-social-media",
      category: "saas-products",
      name: "AI Social Media Engine",
      description: "Social content at scale",
      promptSuffix: ", social media carousel, Instagram post, viral content, engaging design, shareable visual",
      suggestedParams: { quality: "high" },
    },
  ],
};

// Helper to get template by ID
export function getTemplate(category: ImageCategory, templateId: string): ImageTemplate | undefined {
  return IMAGE_TEMPLATES[category]?.find((t) => t.id === templateId);
}

// Helper to get all templates for a category
export function getTemplatesByCategory(category: ImageCategory): ImageTemplate[] {
  return IMAGE_TEMPLATES[category] ?? [];
}

// Helper to apply template to a prompt
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