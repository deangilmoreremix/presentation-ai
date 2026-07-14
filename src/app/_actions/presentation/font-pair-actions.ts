"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server";
import * as z from "zod";

const fontPairSchema = z.object({
  heading: z.string().min(1),
  headingUrl: z.string().optional(),
  headingWeight: z.number().optional(),
  body: z.string().min(1),
  bodyUrl: z.string().optional(),
  bodyWeight: z.number().optional(),
});

export type FontPairFormData = z.infer<typeof fontPairSchema>;

type FontPairRow = {
  id: string;
  heading: string;
  heading_url: string | null;
  heading_weight: number | null;
  body: string;
  body_url: string | null;
  body_weight: number | null;
  user_id: string;
  created_at: string;
};

// Create a new font pair
export async function createFontPair(formData: FontPairFormData) {
  try {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      message: "You must be signed in to save a font pair",
    };
  }

    const validatedData = fontPairSchema.parse(formData);
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, message: "Supabase is not configured" };
    }

    const { data: newFontPair, error } = await supabase
      .from("font_pairs")
      .insert({
        heading: validatedData.heading,
        heading_url: validatedData.headingUrl ?? null,
        heading_weight: validatedData.headingWeight ?? null,
        body: validatedData.body,
        body_url: validatedData.bodyUrl ?? null,
        body_weight: validatedData.bodyWeight ?? null,
        user_id: currentUser.id,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !newFontPair) throw error;

    return {
      success: true,
      fontPairId: newFontPair.id,
      message: "Font pair saved successfully",
    };
  } catch (error) {
    console.error("Failed to create font pair:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message:
          "Invalid font pair data. Please check your inputs and try again.",
      };
    }
    return {
      success: false,
      message: "Something went wrong. Please try again later.",
    };
  }
}

// Get all font pairs for the current user
export async function getUserFontPairs() {
  try {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      message: "You must be signed in to view your font pairs",
      fontPairs: [],
    };
  }

    const supabase = await createClient();
    if (!supabase) {
      return {
        success: false,
        message: "Supabase is not configured",
        fontPairs: [],
      };
    }

    const { data: fontPairs, error } = await supabase
      .from("font_pairs")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, fontPairs: fontPairs ?? [] };
  } catch (error) {
    console.error("Failed to fetch font pairs:", error);
    return {
      success: false,
      message:
        "Unable to load font pairs at this time. Please try again later.",
      fontPairs: [],
    };
  }
}

// Delete a font pair
export async function deleteFontPair(fontPairId: string) {
  try {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      message: "You must be signed in to delete a font pair",
    };
  }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, message: "Supabase is not configured" };
    }

    // Verify ownership
    const { data: existingFontPair, error: fetchErr } = await supabase
      .from("font_pairs")
      .select("user_id, heading_url, body_url")
      .eq("id", fontPairId)
      .maybeSingle<Pick<FontPairRow, "user_id" | "heading_url" | "body_url">>();

    if (fetchErr) throw fetchErr;
    if (!existingFontPair) {
      return { success: false, message: "Font pair not found" };
    }
    if (existingFontPair.user_id !== currentUser.id) {
      return {
        success: false,
        message: "Not authorized to delete this font pair",
      };
    }

    // Delete files from UploadThing if they exist
    const filesToDelete: string[] = [];
    if (existingFontPair.heading_url) {
      const headingKey = existingFontPair.heading_url.split("/").pop();
      if (headingKey) filesToDelete.push(headingKey);
    }
    if (existingFontPair.body_url) {
      const bodyKey = existingFontPair.body_url.split("/").pop();
      if (bodyKey) filesToDelete.push(bodyKey);
    }
    if (filesToDelete.length > 0) {
      try {
        await utapi.deleteFiles(filesToDelete);
      } catch (error) {
        console.error("Failed to delete font files from UploadThing:", error);
      }
    }

    const { error: delErr } = await supabase
      .from("font_pairs")
      .delete()
      .eq("id", fontPairId);
    if (delErr) throw delErr;

    return { success: true, message: "Font pair deleted successfully" };
  } catch (error) {
    console.error("Failed to delete font pair:", error);
    return {
      success: false,
      message:
        "Something went wrong while deleting the font pair. Please try again later.",
    };
  }
}
