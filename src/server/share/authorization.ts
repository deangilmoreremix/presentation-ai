import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ANONYMOUS_USER_ID } from "@/lib/supabase/server";

interface SessionIdentity {
  userId: string | null;
  userEmail: string | null;
}

const ANONYMOUS_SESSION_COOKIE = "anonymous_session_id";

export async function getAnonymousSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(ANONYMOUS_SESSION_COOKIE)?.value;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookieStore.set(ANONYMOUS_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return sessionId;
}

export async function getSessionIdentity(): Promise<SessionIdentity> {
  const currentUser = await getCurrentUser();

  if (currentUser.id === ANONYMOUS_USER_ID) {
    return {
      userId: ANONYMOUS_USER_ID,
      userEmail: currentUser.email,
    };
  }

  return {
    userId: currentUser.id,
    userEmail: currentUser.email,
  };
}

type DocumentAccessRow = {
  user_id: string;
  is_public: boolean;
};

export async function canReadDocument(
  documentId: string,
  identity: SessionIdentity,
) {
  const supabase = await createClient();
  if (!supabase) return false;

  const { data: document, error } = await supabase
    .from("base_documents")
    .select("user_id, is_public")
    .eq("id", documentId)
    .maybeSingle<DocumentAccessRow>();

  if (error || !document) {
    return false;
  }

  return document.is_public || document.user_id === identity.userId;
}

export async function canEditDocument(
  documentId: string,
  identity: SessionIdentity,
) {
  const supabase = await createClient();
  if (!supabase) return false;

  const { data: document, error } = await supabase
    .from("base_documents")
    .select("user_id")
    .eq("id", documentId)
    .maybeSingle<Pick<DocumentAccessRow, "user_id">>();

  if (error || !document) {
    return false;
  }

  return document.user_id === identity.userId;
}

export async function getDocumentAccessForUser(
  documentId: string,
  userId: string | null,
  userEmail: string | null,
) {
  const identity = { userId, userEmail };
  const [canRead, canEdit] = await Promise.all([
    canReadDocument(documentId, identity),
    canEditDocument(documentId, identity),
  ]);

  return { canRead, canEdit };
}
