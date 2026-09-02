import { appLogger } from "@/lib/observability/logger";

type SpanAttributes = Record<string, string | number | boolean | undefined>;

let sentryAvailable = false;
let sentryModule: typeof import("@sentry/nextjs") | null = null;

try {
  const sentry = await import("@sentry/nextjs");
  sentryAvailable = true;
  sentryModule = sentry;
} catch {
  // Sentry is not installed or not available
}

class ConsoleSpan {
  private readonly startedAt = Date.now();
  private attributes: SpanAttributes;

  constructor(
    private readonly name: string,
    initialAttributes?: SpanAttributes,
  ) {
    this.attributes = { ...initialAttributes };
    appLogger.child("server").info("Span started", {
      spanName: this.name,
      attributes: this.attributes,
    });
  }

  annotate(attributes: SpanAttributes) {
    this.attributes = {
      ...this.attributes,
      ...attributes,
    };
  }

  event(name: string, attributes?: SpanAttributes) {
    appLogger.child("server").info(name, {
      spanName: this.name,
      attributes: {
        ...this.attributes,
        ...attributes,
      },
    });
  }

  error(error: unknown) {
    appLogger.child("server").error("Span failed", error, {
      spanName: this.name,
      attributes: this.attributes,
    });

    if (sentryAvailable && sentryModule) {
      try {
        sentryModule.captureException(error, {
          tags: {
            spanName: this.name,
          },
          extra: this.attributes,
        });
      } catch {
        // Sentry reporting failed, but console logging already happened
      }
    }
  }

  end() {
    appLogger.child("server").info("Span ended", {
      spanName: this.name,
      durationMs: Date.now() - this.startedAt,
      attributes: this.attributes,
    });
  }
}

export const logger = {
  info(message: string, attributes?: SpanAttributes) {
    appLogger.child("server").info(message, attributes);
  },
  warn(message: string, attributes?: SpanAttributes) {
    appLogger.child("server").warn(message, attributes);
  },
  error(message: string, error?: unknown, attributes?: SpanAttributes) {
    appLogger.child("server").error(message, error, attributes);

    if (sentryAvailable && sentryModule && error) {
      try {
        sentryModule.captureException(error, {
          tags: {
            logger: "server",
            message,
          },
          extra: attributes,
        });
      } catch {
        // Sentry reporting failed, but console logging already happened
      }
    }
  },
  startSpan(name: string, options?: { attributes?: SpanAttributes }) {
    return new ConsoleSpan(name, options?.attributes);
  },
};
