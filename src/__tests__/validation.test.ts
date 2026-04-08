import { describe, it, expect } from "vitest";
import { validateData, createPresentationSchema, emailSchema } from "@/lib/validation/schemas";

describe("Validation Schemas", () => {
  describe("emailSchema", () => {
    it("should validate correct email addresses", () => {
      const result = validateData(emailSchema, "test@example.com");
      expect(result.success).toBe(true);
      expect(result.data).toBe("test@example.com");
    });

    it("should reject invalid email addresses", () => {
      const result = validateData(emailSchema, "invalid-email");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid email");
    });
  });

  describe("createPresentationSchema", () => {
    it("should validate correct presentation data", () => {
      const validData = {
        title: "Test Presentation",
        topic: "AI Technology",
        slideCount: 5,
        language: "en-US",
        style: "professional",
      };

      const result = validateData(createPresentationSchema, validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should reject invalid slide count", () => {
      const invalidData = {
        title: "Test Presentation",
        topic: "AI Technology",
        slideCount: 100, // Too many slides
      };

      const result = validateData(createPresentationSchema, invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toContain("slides");
    });

    it("should reject empty title", () => {
      const invalidData = {
        title: "",
        topic: "AI Technology",
        slideCount: 5,
      };

      const result = validateData(createPresentationSchema, invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toContain("required");
    });
  });
});