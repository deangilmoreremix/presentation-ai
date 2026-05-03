import { env } from "@/env";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

// Only create checkpointer if DATABASE_URL is available
export const checkpointer = env.DATABASE_URL
  ? PostgresSaver.fromConnString(env.DATABASE_URL)
  : null;

let setupPromise: Promise<void> | null = null;

export async function ensureCheckpointerSetup() {
  if (!checkpointer) {
    console.warn(
      "Checkpointer not initialized: DATABASE_URL is not configured",
    );
    return;
  }

  if (!setupPromise) {
    setupPromise = checkpointer.setup().catch((error) => {
      setupPromise = null;
      throw error;
    });
  }

  await setupPromise;
}
