/**
 * Per-request token store for MCP sessions.
 *
 * The PAT (Personal Access Token) is extracted from the incoming HTTP
 * request's Authorization header and stored here so that tool handlers
 * can access it without needing direct access to the request object.
 *
 * The token is set at the start of each request by the route handler
 * wrapper and cleared afterward.
 */

let _token: string | null = null;

export function setToken(token: string): void {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

export function clearToken(): void {
  _token = null;
}
