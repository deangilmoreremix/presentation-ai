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

