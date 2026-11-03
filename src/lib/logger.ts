type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
}

function safeSerialize(obj: unknown): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return { fallback: String(obj) };
  }
}

function formatLog(level: LogLevel, message: string, meta?: unknown, err?: unknown): LogPayload {
  const payload: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (meta && typeof meta === "object") {
    payload.context = safeSerialize(meta);
  }

  if (err instanceof Error) {
    payload.error = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  } else if (err) {
    payload.error = {
      message: String(err),
    };
  }

  return payload;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "production") {
      // In production, debug logs can be silenced or printed if DEBUG is set
      if (process.env.DEBUG) {
        console.debug(JSON.stringify(formatLog("debug", message, meta)));
      }
    } else {
      console.debug(`[DEBUG] ${message}`, meta || "");
    }
  },

  info(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "production") {
      console.info(JSON.stringify(formatLog("info", message, meta)));
    } else {
      console.info(`[INFO] ${message}`, meta || "");
    }
  },

  warn(message: string, meta?: Record<string, unknown>, err?: unknown) {
    if (process.env.NODE_ENV === "production") {
      console.warn(JSON.stringify(formatLog("warn", message, meta, err)));
    } else {
      console.warn(`[WARN] ${message}`, meta || "", err || "");
    }
  },

  error(message: string, err?: unknown, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "production") {
      console.error(JSON.stringify(formatLog("error", message, meta, err)));
    } else {
      console.error(`[ERROR] ${message}`, err || "", meta || "");
    }
  },
};

