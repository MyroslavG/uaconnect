type DiagnosticContext = Record<string, unknown>;

const sensitiveKeyPattern = /password|secret|token|key|cookie|authorization/i;
const maxStringLength = 500;

export function logServerEvent(event: string, context: DiagnosticContext = {}) {
  console.info(`[uaconnect:${event}]`, sanitizeContext(context));
}

export function logServerError(
  event: string,
  error: unknown,
  context: DiagnosticContext = {},
) {
  console.error(`[uaconnect:${event}]`, {
    ...sanitizeContext(context),
    error: serializeError(error),
  });
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: trimString(error.message),
      name: error.name,
      stack: trimString(error.stack ?? ""),
    };
  }

  return {
    message: trimString(String(error)),
    name: "UnknownError",
  };
}

function sanitizeContext(context: DiagnosticContext) {
  return sanitizeValue(context) as DiagnosticContext;
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return trimString(value);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item));
  }

  const sanitized: DiagnosticContext = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    sanitized[key] = sensitiveKeyPattern.test(key)
      ? "[redacted]"
      : sanitizeValue(nestedValue);
  }

  return sanitized;
}

function trimString(value: string) {
  return value.length > maxStringLength
    ? `${value.slice(0, maxStringLength)}...`
    : value;
}
