"use server";

import { ensureCheckpointerSetup } from "@/ai/lib/postgres";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export async function clearPresentationChat(presentationId: string) {
  const session = await auth();

  const presentation = await db.baseDocument.findFirst({
    where: {
      id: presentationId,
      userId: session.user.id,
      type: "PRESENTATION",
    },
  });

  if (!presentation) {
    throw new Error("Presentation not found");
  }

  await ensureCheckpointerSetup();

  await db.$transaction([
    async () =>
      db.$executeRaw`DELETE FROM checkpoint_blobs WHERE thread_id = ${presentationId}`,
    async () =>
      db.$executeRaw`DELETE FROM checkpoint_writes WHERE thread_id = ${presentationId}`,
    async () =>
      db.$executeRaw`DELETE FROM checkpoints WHERE thread_id = ${presentationId}`,
  ]);

  return { success: true };
}
