import { z } from "zod";

// Common validation schemas
export const emailSchema = z.string().email("Invalid email address").min(1, "Email is required");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const presentationTitleSchema = z
  .string()
  .min(1, "Title is required")
  .max(200, "Title must be less than 200 characters")
  .trim();

export const presentationContentSchema = z
  .string()
  .max(100000, "Content is too large") // 100KB limit
  .optional();

export const themeNameSchema = z
  .string()
  .min(1, "Theme name is required")
  .max(50, "Theme name must be less than 50 characters")
  .regex(/^[a-zA-Z0-9\s\-_]+$/, "Theme name contains invalid characters");

export const slideCountSchema = z
  .number()
  .int()
  .min(1, "Must have at least 1 slide")
  .max(50, "Cannot have more than 50 slides");

export const languageSchema = z.enum([
  "en-US", "es-ES", "fr-FR", "de-DE", "it-IT", "pt-BR", "ja-JP", "ko-KR", "zh-CN", "ru-RU"
]);

// API request validation schemas
export const createPresentationSchema = z.object({
  title: presentationTitleSchema,
  topic: z.string().min(1, "Topic is required").max(500, "Topic is too long"),
  slideCount: slideCountSchema,
  language: languageSchema.optional(),
  style: z.enum(["professional", "casual"]).optional(),
  imageSource: z.enum(["ai", "stock"]).optional(),
});

export const updatePresentationSchema = z.object({
  title: presentationTitleSchema.optional(),
  content: presentationContentSchema,
  theme: z.string().optional(),
});

export const createThemeSchema = z.object({
  name: themeNameSchema,
  description: z.string().max(500, "Description is too long").optional(),
  themeData: z.object({
    colors: z.object({
      primary: z.string(),
      secondary: z.string().optional(),
      accent: z.string().optional(),
      background: z.string(),
      text: z.string(),
      heading: z.string().optional(),
    }),
    fonts: z.object({
      heading: z.string(),
      body: z.string(),
    }),
  }),
});

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*\bon\w+=/gi, "<")
    .replace(/javascript:/gi, "");
}

// Validation helper
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map(e => e.message).join(", ") };
    }
    return { success: false, error: "Invalid data format" };
  }
}