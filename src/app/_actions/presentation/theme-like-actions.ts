"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server";

type ThemeRow = {
  id: string;
};

type LikeRow = {
  id: string;
  user_id: string;
  theme_id: string;
};

// Toggle like status for a theme
export async function toggleLikeTheme(themeId: string) {
  try {
  const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: "You must be signed in to like themes",
        isLiked: false,
        likeCount: 0,
      };
    }

    const supabase = await createClient();
    if (!supabase) {
      return {
        success: false,
        message: "Supabase is not configured",
        isLiked: false,
        likeCount: 0,
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
      return {
        success: false,
        message: "Theme not found",
        isLiked: false,
        likeCount: 0,
      };
    }

    // Check if already liked
    const { data: existing, error: findErr } = await supabase
      .from("presentation_theme_likes")
      .select("id, user_id, theme_id")
      .eq("user_id", currentUser.id)
      .eq("theme_id", themeId)
      .maybeSingle<LikeRow>();

    if (findErr) throw findErr;

    if (existing) {
      const { error: delErr } = await supabase
        .from("presentation_theme_likes")
        .delete()
        .eq("id", existing.id);
      if (delErr) throw delErr;
    } else {
      const { error: insErr } = await supabase
        .from("presentation_theme_likes")
        .insert({ user_id: currentUser.id, theme_id: themeId });
      if (insErr) throw insErr;
    }

    // Get updated like count
    const { count: likeCount, error: countErr } = await supabase
      .from("presentation_theme_likes")
      .select("id", { count: "exact", head: true })
      .eq("theme_id", themeId);

    if (countErr) throw countErr;

    const isLiked = !existing;

    return {
      success: true,
      isLiked,
      likeCount: likeCount ?? 0,
      message: isLiked ? "Theme liked" : "Theme unliked",
    };
  } catch (error) {
    console.error("Failed to toggle like:", error);
    return {
      success: false,
      message: "Something went wrong. Please try again later.",
      isLiked: false,
      likeCount: 0,
    };
  }
}

// Get like counts for multiple themes
export async function getThemeLikes(themeIds: string[]) {
  try {
    if (themeIds.length === 0) {
      return {
        success: true,
        likes: {} as Record<string, number>,
      };
    }

    const supabase = await createClient();
    if (!supabase) {
      return {
        success: false,
        message: "Supabase is not configured",
        likes: {} as Record<string, number>,
      };
    }

    const { data: likes, error } = await supabase
      .from("presentation_theme_likes")
      .select("theme_id")
      .in("theme_id", themeIds);

    if (error) throw error;

    const likesMap: Record<string, number> = {};
    (likes ?? []).forEach((like: { theme_id: string }) => {
      likesMap[like.theme_id] = (likesMap[like.theme_id] ?? 0) + 1;
    });

    // Ensure all themeIds are in the map (even if count is 0)
    themeIds.forEach((id) => {
      if (!(id in likesMap)) {
        likesMap[id] = 0;
      }
    });

    return {
      success: true,
      likes: likesMap,
    };
  } catch (error) {
    console.error("Failed to fetch theme likes:", error);
    return {
      success: false,
      message: "Unable to load theme likes. Please try again later.",
      likes: {} as Record<string, number>,
    };
  }
}

// Check if user has liked specific themes
export async function getUserLikedThemeIds(themeIds: string[]) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: "You must be signed in to view liked themes",
        themeIds: [] as string[],
      };
    }

    if (themeIds.length === 0) {
      return {
        success: true,
        themeIds: [] as string[],
      };
    }

    if (themeIds.length === 0) {
      return {
        success: true,
        themeIds: [] as string[],
      };
    }

    const supabase = await createClient();
    if (!supabase) {
      return {
        success: false,
        message: "Supabase is not configured",
        themeIds: [] as string[],
      };
    }

    const { data: likes, error } = await supabase
      .from("presentation_theme_likes")
      .select("theme_id")
      .eq("user_id", currentUser.id)
      .in("theme_id", themeIds);

    if (error) throw error;

    const likedThemeIds = (likes ?? []).map((like: { theme_id: string }) => like.theme_id);

    return {
      success: true,
      themeIds: likedThemeIds,
    };
  } catch (error) {
    console.error("Failed to fetch liked theme IDs:", error);
    return {
      success: false,
      message: "Unable to load liked themes. Please try again later.",
      themeIds: [] as string[],
    };
  }
}
