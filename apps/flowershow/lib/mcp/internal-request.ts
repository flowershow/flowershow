/**
 * In-process calls from the MCP endpoint to the REST route handlers (sync,
 * status, create site) on behalf of a user the MCP endpoint has already
 * authenticated (PAT, CLI token or OAuth access token).
 *
 * The marker is a module-private Symbol property on the request object. It
 * can't be set over HTTP (Next builds network requests itself, and headers or
 * body can't create a Symbol property), so only code that imports this module
 * and constructs the request can act as a user this way. OAuth access tokens
 * themselves are never accepted by REST routes.
 */

const MCP_INTERNAL = Symbol('flowershow.mcp-internal');

export type McpInternalCaller = {
  /** The authenticated user to act as. Absent for anonymous (claim-token) calls. */
  userId?: string;
};

type Marked = { [MCP_INTERNAL]?: McpInternalCaller };

/** Mark a request built in-process by the MCP endpoint. */
export function markMcpInternal<T extends object>(
  request: T,
  caller: McpInternalCaller,
): T {
  Object.defineProperty(request, MCP_INTERNAL, {
    value: Object.freeze({ ...caller }),
    enumerable: false,
    writable: false,
  });
  return request;
}

/** The MCP caller of an in-process request, or undefined for network requests. */
export function mcpInternalCaller(
  request: object,
): McpInternalCaller | undefined {
  return (request as Marked)[MCP_INTERNAL];
}
