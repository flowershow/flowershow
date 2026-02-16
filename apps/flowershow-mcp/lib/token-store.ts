/**
 * In-memory token store for MCP sessions.
 *
 * The MCP server runs as a stateless HTTP handler on Vercel, but within a
 * single serverless function invocation the process stays alive long enough
 * for the device-auth polling loop to complete.  For multi-request flows
 * (SSE transport) the token is passed back to the client as tool output and
 * re-supplied by the AI assistant on subsequent calls.
 *
 * This store is intentionally simple: one token per server instance.  A
 * production upgrade could use Redis / KV if needed.
 */

let _token: string | null = null;
let _deviceCode: string | null = null;

export function setToken(token: string): void {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

export function clearToken(): void {
  _token = null;
}

export function setDeviceCode(code: string): void {
  _deviceCode = code;
}

export function getDeviceCode(): string | null {
  return _deviceCode;
}

export function clearDeviceCode(): void {
  _deviceCode = null;
}
