/**
 * Basic input sanitization for user-generated content.
 *
 * This provides defense-in-depth against XSS by stripping dangerous HTML tags
 * and attributes before content is persisted or rendered.
 */

/**
 * Sanitizes a string by removing potentially dangerous HTML tags and attributes.
 * Uses a whitelist approach: only safe tags and attributes are preserved.
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    // Remove any script-like patterns that might have been encoded
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

/**
 * Sanitizes an object by recursively sanitizing all string values.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeHtml(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeHtml(item) : item,
      );
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Truncates a string to a maximum length to prevent abuse.
 */
export function truncate(input: string, maxLength: number): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  if (input.length <= maxLength) {
    return input;
  }

  return input.substring(0, maxLength) + "...";
}

/**
 * Validates that a string is safe for use as a filename.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") {
    return "unnamed";
  }

  // Remove path separators and other dangerous characters
  return filename
    .replace(/[\\/]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/[<>:"|?*]/g, "_")
    // Replace control characters (codepoints 0-31) with underscores.
    // Biome disallows \x00-\x1F inside regex character classes, so iterate.
    .split("")
    .map((ch) => (ch.charCodeAt(0) <= 31 ? "_" : ch))
    .join("")
    .substring(0, 255);
}
