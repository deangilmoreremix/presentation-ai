import { env } from "@/env";
import { MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

// Fall back to an in-memory checkpointer when no Postgres connection string is
// configured so the agent route still works (without cross-request persistence)
// instead of crashing at import time.
export const checkpointer = env.DATABASE_URL
  ? PostgresSaver.fromConnString(env.DATABASE_URL)
  : new MemorySaver();

let setupPromise: Promise<void> | null = null;

export async function ensureCheckpointerSetup() {
  if (!(checkpointer instanceof PostgresSaver)) return;
  if (!setupPromise) {
    setupPromise = checkpointer.setup().catch((error) => {
      setupPromise = null;
      throw error;
    });
  }

  await setupPromise;
}
