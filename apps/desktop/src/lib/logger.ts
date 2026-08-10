// Structured Logger — production-grade logging with levels, context, and correlation IDs.
// Zero external deps. Works in browser and Node (server.mjs).

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

let currentLevel: LogLevel = 'info';
let correlationIdCounter = 0;
const subscribers: Array<(entry: LogEntry) => void> = [];

function generateCorrelationId(): string {
  return `corr_${Date.now()}_${++correlationIdCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatEntry(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: {
      correlationId: context.correlationId ?? generateCorrelationId(),
      sessionId: context.sessionId ?? (typeof window !== 'undefined' ? sessionStorage.getItem('agenmonster_session_id') ?? undefined : undefined),
      ...context,
    },
  };
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function log(level: LogLevel, message: string, context: LogContext = {}): void {
  if (!shouldLog(level)) return;

  const entry = formatEntry(level, message, context);

  // Console output with colors (browser/Node)
  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
  const ctxStr = Object.keys(entry.context).length ? ` ${JSON.stringify(entry.context)}` : '';

  switch (level) {
    case 'debug':
      console.debug(`${prefix} ${message}${ctxStr}`);
      break;
    case 'info':
      console.info(`${prefix} ${message}${ctxStr}`);
      break;
    case 'warn':
      console.warn(`${prefix} ${message}${ctxStr}`);
      break;
    case 'error':
    case 'fatal':
      console.error(`${prefix} ${message}${ctxStr}`);
      break;
  }

  // Notify subscribers (for external log aggregation)
  subscribers.forEach((fn) => {
    try {
      fn(entry);
    } catch {
      // Ignore subscriber errors
    }
  });
}

// Type for the logger interface
interface Logger {
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  fatal(message: string, context?: LogContext): void;
  child(boundContext: LogContext): Logger;
  withCorrelationId(correlationId: string): Logger;
  newCorrelationId(): string;
  subscribe(fn: (entry: LogEntry) => void): () => void;
  unsubscribe(fn: (entry: LogEntry) => void): void;
}

const logger: Logger = {
  setLevel(level: LogLevel): void {
    currentLevel = level;
  },

  getLevel(): LogLevel {
    return currentLevel;
  },

  debug(message: string, context?: LogContext): void {
    log('debug', message, context);
  },

  info(message: string, context?: LogContext): void {
    log('info', message, context);
  },

  warn(message: string, context?: LogContext): void {
    log('warn', message, context);
  },

  error(message: string, context?: LogContext): void {
    log('error', message, context);
  },

  fatal(message: string, context?: LogContext): void {
    log('fatal', message, context);
  },

  // Create a child logger with bound context
  child(boundContext: LogContext): Logger {
    return {
      setLevel: logger.setLevel,
      getLevel: logger.getLevel,
      debug: (msg: string, ctx?: LogContext) => logger.debug(msg, { ...boundContext, ...ctx }),
      info: (msg: string, ctx?: LogContext) => logger.info(msg, { ...boundContext, ...ctx }),
      warn: (msg: string, ctx?: LogContext) => logger.warn(msg, { ...boundContext, ...ctx }),
      error: (msg: string, ctx?: LogContext) => logger.error(msg, { ...boundContext, ...ctx }),
      fatal: (msg: string, ctx?: LogContext) => logger.fatal(msg, { ...boundContext, ...ctx }),
      child: (ctx: LogContext) => logger.child({ ...boundContext, ...ctx }),
      withCorrelationId: (correlationId: string) => logger.child({ ...boundContext, correlationId }),
      newCorrelationId: logger.newCorrelationId,
      subscribe: logger.subscribe,
      unsubscribe: logger.unsubscribe,
    };
  },

  // Correlation ID helpers
  withCorrelationId(correlationId: string): typeof logger {
    return logger.child({ correlationId });
  },

  newCorrelationId(): string {
    return generateCorrelationId();
  },

  // Subscriber management for log aggregation
  subscribe(fn: (entry: LogEntry) => void): () => void {
    subscribers.push(fn);
    return () => {
      const idx = subscribers.indexOf(fn);
      if (idx >= 0) subscribers.splice(idx, 1);
    };
  },

  unsubscribe(fn: (entry: LogEntry) => void): void {
    const idx = subscribers.indexOf(fn);
    if (idx >= 0) subscribers.splice(idx, 1);
  },
};

export { logger };

// Convenience: timed operation logging
export async function withTiming<T>(
  action: string,
  fn: () => Promise<T>,
  context: LogContext = {}
): Promise<T> {
  const start = performance.now();
  const corrId = context.correlationId || logger.newCorrelationId();
  const child = logger.child({ ...context, correlationId: corrId, action });

  child.debug(`${action} started`);
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - start);
    child.info(`${action} completed`, { durationMs: duration });
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    child.error(`${action} failed`, { durationMs: duration, error: String(error) });
    throw error;
  }
}

// Convenience: error boundary logging
export function logError(error: unknown, context: LogContext = {}): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error(message, { ...context, error: { message, stack } });
}

// Initialize session ID for correlation
if (typeof window !== 'undefined') {
  if (!sessionStorage.getItem('agenmonster_session_id')) {
    sessionStorage.setItem('agenmonster_session_id', `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
  }
}