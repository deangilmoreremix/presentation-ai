import { env } from "@/env";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

/**
 * LangGraph Postgres checkpointer for conversation persistence.
 *
 * `DATABASE_URL` is optional (see `src/env.js`) so that `next build` and CI
 * do not require a live database. The connection is therefore created lazily
 * rather than at import time, so a missing value fails at the point of use
 * with an actionable message instead of while this module is being loaded.
 */
let checkpointer: PostgresSaver | null = null;

export function getCheckpointer(): PostgresSaver {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. Set it to a PostgreSQL connection string to enable LangGraph checkpoint persistence.",
    );
  }

  if (!checkpointer) {
    checkpointer = PostgresSaver.fromConnString(env.DATABASE_URL);
  }

  return checkpointer;
}

let setupPromise: Promise<void> | null = null;

export async function ensureCheckpointerSetup() {
  if (!setupPromise) {
    setupPromise = getCheckpointer()
      .setup()
      .catch((error) => {
        setupPromise = null;
        throw error;
      });
  }

  await setupPromise;
}
