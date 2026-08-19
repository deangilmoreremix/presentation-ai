"use server";

import { presentationThemeStyleDataSchema } from "@/lib/presentation/theme-schema";
import { createClient, getClerkUserId } from "@/lib/supabase/server";
import * as z from "zod";

// Schema for creating/updating a theme
const themeSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  themeData: presentationThemeStyleDataSchema,
  logoUrl: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
});

export type ThemeFormData = z.infer<typeof themeSchema>;

type ThemeRow = {
  id: string;
  name: string;
  description: string | null;
  theme_data: unknown;
  logo_url: string | null;
  is_public: boolean;
  is_admin: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

// Create a new custom theme
export async function createCustomTheme(formData: ThemeFormData) {
  try {
    const validatedData = themeSchema.parse(formData);
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, message: "Supabase is not configured" };
    }

    const { data: newTheme, error } = await supabase
      .from("presentation_themes")
      .insert({
        name: validatedData.name,
        description: validatedData.description ?? null,
        theme_data: validatedData.themeData,
        logo_url: validatedData.logoUrl ?? null,
        is_public: false,
        is_admin: false,
        user_id: await getClerkUserId(),
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !newTheme) throw error;

    return {
      success: true,
      themeId: newTheme.id,
      message: "Theme created successfully",
    };
  } catch (error) {
    console.error("Failed to create custom theme:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid theme data. Please check your inputs and try again.",
      };
    }
    return {
      success: false,
      message: "Something went wrong. Please try again later.",
    };
  }
}

// Update an existing custom theme
export async function updateCustomTheme(
  themeId: string,
  formData: ThemeFormData,
) {
  try {
    const validatedData = themeSchema.parse(formData);
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, message: "Supabase is not configured" };
    }

    const { error } = await supabase
      .from("presentation_themes")
      .update({
        name: validatedData.name,
        description: validatedData.description ?? null,
        theme_data: validatedData.themeData,
        logo_url: validatedData.logoUrl ?? null,
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", themeId)
      .eq("user_id", await getClerkUserId());

    if (error) throw error;

    return {
      success: true,
      message: "Theme updated successfully",
    };
  } catch (error) {
    console.error("Failed to update custom theme:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid theme data. Please check your inputs and try again.",
      };
    }
    return {
      success: false,
      message: "Something went wrong. Please try again later.",
    };
  }
}

// Update a system theme in place. Only application admins can change seeded themes.
export async function updateAdminPresentationTheme(
  themeId: string,
  formData: ThemeFormData,
) {
  try {
    const validatedData = themeSchema.parse(formData);
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, message: "Supabase is not configured" };
    }

    const { data: existingTheme, error: fetchErr } = await supabase
      .from("presentation_themes")
      .select("is_admin")
      .eq("id", themeId)
      .maybeSingle<Pick<ThemeRow, "is_admin">>();

    if (fetchErr) throw fetchErr;
    if (!existingTheme) {
      return { success: false, message: "Theme not found" };
    }
    if (!existingTheme.is_admin) {
      return {
        success: false,
        message: "This action can only update system themes",
      };
    }

    const { error } = await supabase
      .from("presentation_themes")
      .update({
        name: validatedData.name,
        description: validatedData.description ?? null,
        theme_data: validatedData.themeData,
        logo_url: validatedData.logoUrl ?? null,
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", themeId);

    if (error) throw error;

    return {
      success: true,
      message: "System theme updated successfully",
    };
  } catch (error) {
    console.error("Failed to update system theme:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid theme data. Please check your inputs and try again.",
      };
    }
    return {
      success: false,
      message: "Something went wrong. Please try again later.",
    };
  }
}

// Get system themes that are stored in the database
export async function getSystemPresentationThemes() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, message: "Supabase is not configured", themes: [] };
    }

    const { data: themes, error } = await supabase
      .from("presentation_themes")
      .select("*")
      .eq("is_admin", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const camel = (themes ?? []).map((t) => ({
      ...t,
      themeData: t.theme_data,
      logoUrl: t.logo_url,
      isPublic: t.is_public,
      isAdmin: t.is_admin,
      userId: t.user_id,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
    return { success: true, themes: camel };
  } catch (error) {
    console.error("Failed to fetch system themes:", error);
    return {
      success: false,
      message:
        "Unable to load system themes at this time. Please try again later.",
      themes: [],
    };
  }
}

// Get all custom themes for the current user
export async function getUserCustomThemes() {
  try {
    const userId = await getClerkUserId();

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, message: "Supabase is not configured", themes: [] };
    }

    const { data: themes, error } = await supabase
      .from("presentation_themes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const camel = (themes ?? []).map((t) => ({
      ...t,
      themeData: t.theme_data,
      logoUrl: t.logo_url,
      isPublic: t.is_public,
      isAdmin: t.is_admin,
      userId: t.user_id,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
    return { success: true, themes: camel };
  } catch (error) {
    console.error("Failed to fetch custom themes:", error);
    return {
      success: false,
      message: "Unable to load themes at this time. Please try again later.",
      themes: [],
    };
  }
}

type PublicThemeRow = ThemeRow & {
  user: { name: string | null } | { name: string | null }[] | null;
  presentation_theme_likes: unknown;
  favorite_presentation_themes: unknown;
};

// Get all public themes, including like counts and user engagement flags
export async function getPublicCustomThemes() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, message: "Supabase is not configured", themes: [] };
    }

    const { data: themes, error } = await supabase
      .from("presentation_themes")
      .select(
        "*, user:users(name), presentation_theme_likes!left(id, user_id), favorite_presentation_themes!left(id, user_id)",
      )
      .eq("is_public", true)
      .eq("is_admin", false)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const shaped = (themes ?? []).map((row) => {
      const user = Array.isArray(row.user) ? row.user[0] : row.user;
      const likesRaw = row.presentation_theme_likes;
      const favsRaw = row.favorite_presentation_themes;
      const likes = Array.isArray(likesRaw)
        ? (likesRaw as { id: string }[])
        : likesRaw
          ? [likesRaw as { id: string }]
          : [];
      const favs = Array.isArray(favsRaw)
        ? (favsRaw as { id: string }[])
        : favsRaw
          ? [favsRaw as { id: string }]
          : [];
      return {
        ...row,
        themeData: row.theme_data,
        logoUrl: row.logo_url,
        isPublic: row.is_public,
        isAdmin: row.is_admin,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        name: row.name,
        likeCount: likes.length,
        isLiked: likes.length > 0,
        isFavorite: favs.length > 0,
        user,
      };
    });

    return { success: true, themes: shaped };
  } catch (error) {
    console.error("Failed to fetch public themes:", error);
    return {
      success: false,
      message:
        "Unable to load public themes at this time. Please try again later.",
      themes: [],
    };
  }
}

// Get a single theme by ID
export async function getCustomThemeById(themeId: string) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, message: "Supabase is not configured" };
    }

    const { data: theme, error } = await supabase
      .from("presentation_themes")
      .select("*, user:users(name)")
      .eq("id", themeId)
      .maybeSingle<ThemeRow & { user: { name: string | null } | { name: string | null }[] | null }>();

    if (error) throw error;
    if (!theme) {
      return { success: false, message: "Theme not found" };
    }

    // Transform snake_case row to camelCase so consumers can use
    // `theme.themeData` and `user.name` directly.
    const user = Array.isArray(theme.user) ? theme.user[0] : theme.user;
    const camelTheme = {
      ...theme,
      themeData: theme.theme_data,
      logoUrl: theme.logo_url,
      isPublic: theme.is_public,
      isAdmin: theme.is_admin,
      userId: theme.user_id,
      createdAt: theme.created_at,
      updatedAt: theme.updated_at,
      user: user ?? null,
    };

    return { success: true, theme: camelTheme };
  } catch (error) {
    console.error("Failed to fetch theme:", error);
    return {
      success: false,
      message: "Unable to load the theme at this time. Please try again later.",
    };
  }
}

