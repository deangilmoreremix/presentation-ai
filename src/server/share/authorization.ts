import { createClient, getCurrentUser } from "@/lib/supabase/server";

interface SessionIdentity {
  userId: string | null;
  userEmail: string | null;
}

export async function getSessionIdentity(): Promise<SessionIdentity> {
  const currentUser = await getCurrentUser();
  return {
    userId: currentUser?.id ?? null,
    userEmail: currentUser?.email ?? null,
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
