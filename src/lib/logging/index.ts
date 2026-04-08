type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, data?: any, context?: { userId?: string; sessionId?: string; requestId?: string }) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      ...context,
    };

    // Add to in-memory logs for debugging
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with structured format
    const logData = {
      timestamp: entry.timestamp,
      level: entry.level.toUpperCase(),
      message: entry.message,
      ...(entry.data && { data: entry.data }),
      ...(context && { context }),
    };

    switch (level) {
      case "debug":
        if (process.env.NODE_ENV === "development") {
          console.debug(JSON.stringify(logData, null, 2));
        }
        break;
      case "info":
        console.info(JSON.stringify(logData));
        break;
      case "warn":
        console.warn(JSON.stringify(logData));
        break;
      case "error":
        console.error(JSON.stringify(logData));
        // In production, you might want to send to external logging service
        this.sendToExternalService(entry);
        break;
    }
  }

  debug(message: string, data?: any, context?: { userId?: string; sessionId?: string; requestId?: string }) {
    this.log("debug", message, data, context);
  }

  info(message: string, data?: any, context?: { userId?: string; sessionId?: string; requestId?: string }) {
    this.log("info", message, data, context);
  }

  warn(message: string, data?: any, context?: { userId?: string; sessionId?: string; requestId?: string }) {
    this.log("warn", message, data, context);
  }

  error(message: string, data?: any, context?: { userId?: string; sessionId?: string; requestId?: string }) {
    this.log("error", message, data, context);
  }

  // Get recent logs for debugging
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Send critical errors to external service (implement based on your logging provider)
  private sendToExternalService(entry: LogEntry) {
    // Example: Send to logging service like Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === "production") {
      // Implement your external logging service here
      // Example: Sentry, DataDog, CloudWatch, etc.
      console.error("PRODUCTION ERROR - Send to external service:", entry);
    }
  }

  // Performance logging
  logPerformance(operation: string, duration: number, context?: { userId?: string; requestId?: string }) {
    this.info(`Performance: ${operation}`, { duration: `${duration}ms` }, context);
  }

  // Security logging
  logSecurity(event: string, details: any, context?: { userId?: string; ip?: string }) {
    this.warn(`Security: ${event}`, details, context);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Request logging middleware helper
export function logRequest(request: Request, responseTime?: number, context?: { userId?: string }) {
  logger.info(`HTTP ${request.method} ${request.url}`, {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get("user-agent"),
    responseTime: responseTime ? `${responseTime}ms` : undefined,
  }, context);
}

// Error logging helper
export function logError(error: Error, context?: { userId?: string; requestId?: string; url?: string }) {
  logger.error(`Application Error: ${error.message}`, {
    stack: error.stack,
    name: error.name,
  }, context);
}