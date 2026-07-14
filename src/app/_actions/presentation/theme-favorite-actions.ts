"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server";

type ThemeRow = {
  id: string;
  is_admin: boolean;
};

type FavoriteRow = {
  id: string;
  user_id: string;
  theme_id: string;
};

// Toggle favorite status for a theme
export async function toggleFavoriteTheme(themeId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
    return {
      success: false,
      message: "You must be signed in to favorite themes",
      isFavorite: false,
    };
  }

    const supabase = await createClient();
    if (!supabase) {
      return {
        success: false,
        message: "Supabase is not configured",
        isFavorite: false,
      };
    }

    // Check if theme exists
    const { data: theme, error: themeErr } = await supabase
      .from("presentation_themes")
      .select("id")
      .eq("id", themeId)
      .maybeSingle<ThemeRow>();

    if (themeErr) throw themeErr;
    if (!theme) {
      return { success: false, message: "Theme not found", isFavorite: false };
    }

    // Check if already favorited
    const { data: existing, error: findErr } = await supabase
      .from("favorite_presentation_themes")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("theme_id", themeId)
      .maybeSingle<FavoriteRow>();

    if (findErr) throw findErr;

    if (existing) {
      const { error: delErr } = await supabase
        .from("favorite_presentation_themes")
        .delete()
        .eq("id", existing.id);
      if (delErr) throw delErr;
      return {
        success: true,
        isFavorite: false,
        message: "Theme removed from favorites",
      };
    }

    const { error: insErr } = await supabase
      .from("favorite_presentation_themes")
      .insert({ user_id: currentUser.id, theme_id: themeId });
    if (insErr) throw insErr;
    return {
      success: true,
      isFavorite: true,
      message: "Theme added to favorites",
    };
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again later.",
      isFavorite: false,
    };
  }
}

type FavoriteWithThemeRow = {
  id: string;
  user_id: string;
  theme_id: string;
  created_at: string;
  theme:
    | (ThemeRow & {
        user: { name: string | null } | { name: string | null }[] | null;
        presentation_theme_likes: unknown;
      })
    | ThemeRow[]
    | null;
};

type ThemeLikeRow = { id: string; user_id: string };

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function pickLikes(value: unknown): ThemeLikeRow[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as ThemeLikeRow[];
  return [value as ThemeLikeRow];
}

// Get favorite themes for the current user, including like counts and user liked flag
export async function getUserFavoriteThemes() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
    return {
      success: false,
      message: "You must be signed in to view favorite themes",
      themes: [],
    };
  }

    const supabase = await createClient();
    if (!supabase) {
      return {
        success: false,
        message: "Supabase is not configured",
        themes: [],
      };
    }

    const { data: favorites, error } = await supabase
      .from("favorite_presentation_themes")
      .select(
        "id, user_id, theme_id, created_at, theme:presentation_themes!inner(*, user:users(name), presentation_theme_likes!left(id, user_id))",
      )
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const themes = (favorites ?? [])
      .filter((fav) => {
        const theme = pickFirst(fav.theme);
        return theme != null;
      })
      .map((fav) => {
        const theme = pickFirst(fav.theme);
        const likes = pickLikes(theme?.presentation_theme_likes);
        return {
          ...(theme ?? {}),
          likeCount: likes.length,
          isLiked: likes.some((l) => l.user_id === currentUser.id),
          isFavorite: true,
        };
      });

    return { success: true, themes };
  } catch (error) {
    console.error("Failed to fetch favorite themes:", error);
    return {
      success: false,
      message: "Unable to load favorite themes. Please try again later.",
      themes: [],
    };
  }
}

// Get favorite theme IDs for the current user
export async function getUserFavoriteThemeIds() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: "You must be signed in to view favorite theme IDs",
        themeIds: [],
      };
    }

    const supabase = await createClient();
    if (!supabase) {
      return {
        success: false,
        message: "Supabase is not configured",
        themeIds: [],
      };
    }

    const { data: favorites, error } = await supabase
      .from("favorite_presentation_themes")
      .select("theme_id")
      .eq("user_id", currentUser.id);

    if (error) throw error;

    const themeIds = (favorites ?? []).map((fav) => fav.theme_id);

    return {
      success: true,
      themeIds,
    };
  } catch (error) {
    console.error("Failed to fetch favorite theme IDs:", error);
    return {
      success: false,
      message: "Unable to load favorite themes. Please try again later.",
      themeIds: [],
    };
  }
}
