/**
 * Structured logger for the Flowershow MCP server.
 *
 * All output goes to stderr (via console.error / console.warn / console.info)
 * so it doesn't interfere with MCP protocol messages on stdout.
 *
 * Log levels:
 *   debug  – Verbose detail (API payloads, response bodies)
 *   info   – Normal operations (requests, tool calls)
 *   warn   – Recoverable issues (retries, unexpected shapes)
 *   error  – Failures (API errors, crashes)
 *
 * Control via LOG_LEVEL env var (default: "info").
 * Set to "debug" for full request/response tracing.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function currentLevel(): number {
  const env = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel;
  return LEVELS[env] ?? LEVELS.info;
}

function ts(): string {
  return new Date().toISOString();
}

/** Mask a bearer token for safe logging (first 4 + last 4 chars). */
function maskToken(token: string): string {
  if (token.length <= 12) return '***';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function emit(
  level: LogLevel,
  component: string,
  message: string,
  data?: Record<string, unknown>,
) {
  if (LEVELS[level] < currentLevel()) return;

  const entry: Record<string, unknown> = {
    ts: ts(),
    level,
    component,
    msg: message,
  };
  if (data) {
    Object.assign(entry, data);
  }

  const line = JSON.stringify(entry);

  switch (level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    default:
      // Use console.error for all levels to keep stdout clean for MCP protocol
      console.error(line);
      break;
  }
}

/** Create a scoped logger for a specific component. */
export function createLogger(component: string) {
  return {
    debug: (msg: string, data?: Record<string, unknown>) =>
      emit('debug', component, msg, data),
    info: (msg: string, data?: Record<string, unknown>) =>
      emit('info', component, msg, data),
    warn: (msg: string, data?: Record<string, unknown>) =>
      emit('warn', component, msg, data),
    error: (msg: string, data?: Record<string, unknown>) =>
      emit('error', component, msg, data),
  };
}

export { maskToken };
export type Logger = ReturnType<typeof createLogger>;
