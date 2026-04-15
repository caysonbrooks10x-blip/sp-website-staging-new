/**
 * Minimal structured logger.
 *
 * Emits one JSON object per log event on stdout, which Vercel's runtime
 * log aggregator will parse as a structured event. No external deps.
 *
 * Design notes:
 *   - No log levels below `info` are emitted in production by default.
 *   - Context fields (request_id, model, provider, route) are attached
 *     via `withContext()` so a route handler or provider call doesn't
 *     have to repeat them on every line.
 *   - `startTimer()` returns a closure that measures duration in ms
 *     and attaches it to the final event — useful for per-request and
 *     per-provider-call timing.
 *   - Swappable sink for tests: `setSink()` installs a custom writer.
 *     Default sink writes JSON to stdout/stderr.
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogContext {
  request_id?: string
  model?: string
  provider?: string
  route?: string
  user_id?: string
  [extra: string]: unknown
}

export interface LogEvent extends LogContext {
  level: LogLevel
  message: string
  timestamp: string
  duration_ms?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
}

type Sink = (event: LogEvent) => void

const defaultSink: Sink = (event) => {
  const line = JSON.stringify(event)
  if (event.level === "error") {
    process.stderr.write(line + "\n")
  } else {
    process.stdout.write(line + "\n")
  }
}

let activeSink: Sink = defaultSink

export function setSink(sink: Sink | null): void {
  activeSink = sink ?? defaultSink
}

function shouldEmit(level: LogLevel): boolean {
  if (level === "debug") {
    // Only emit debug in non-production or when explicitly enabled.
    return process.env.NODE_ENV !== "production" || process.env.LOG_DEBUG === "1"
  }
  return true
}

function emit(level: LogLevel, message: string, context: LogContext, extra?: LogContext): void {
  if (!shouldEmit(level)) return
  const event: LogEvent = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
    ...(extra ?? {}),
  }
  try {
    activeSink(event)
  } catch {
    // Never let logging throw into the caller.
  }
}

export interface Logger {
  debug(message: string, extra?: LogContext): void
  info(message: string, extra?: LogContext): void
  warn(message: string, extra?: LogContext): void
  error(message: string, errOrExtra?: unknown, extra?: LogContext): void
  withContext(context: LogContext): Logger
  startTimer(): (message: string, extra?: LogContext) => void
}

export function createLogger(baseContext: LogContext = {}): Logger {
  const logger: Logger = {
    debug(message, extra) {
      emit("debug", message, baseContext, extra)
    },
    info(message, extra) {
      emit("info", message, baseContext, extra)
    },
    warn(message, extra) {
      emit("warn", message, baseContext, extra)
    },
    error(message, errOrExtra, extra) {
      let errField: LogEvent["error"] | undefined
      let rest: LogContext | undefined = extra
      if (errOrExtra instanceof Error) {
        errField = {
          name: errOrExtra.name,
          message: errOrExtra.message,
          stack: errOrExtra.stack,
        }
      } else if (errOrExtra && typeof errOrExtra === "object") {
        rest = { ...(errOrExtra as LogContext), ...(extra ?? {}) }
      }
      emit("error", message, baseContext, {
        ...(rest ?? {}),
        ...(errField ? { error: errField } : {}),
      })
    },
    withContext(context) {
      return createLogger({ ...baseContext, ...context })
    },
    startTimer() {
      const started = Date.now()
      return (message, extra) => {
        const duration_ms = Date.now() - started
        emit("info", message, baseContext, { ...(extra ?? {}), duration_ms })
      }
    },
  }
  return logger
}

/** Root application logger with no preset context. */
export const logger = createLogger()
