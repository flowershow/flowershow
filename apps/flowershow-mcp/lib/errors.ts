/**
 * Structured MCP-layer errors.
 *
 * Each helper returns a plain object suitable for the `content` array of an
 * MCP tool response with `isError: true`.
 */

// ── Base helper ─────────────────────────────────────────────

export interface McpErrorContent {
  type: 'text';
  text: string;
}

function errorContent(message: string): McpErrorContent {
  return { type: 'text', text: message };
}

// ── Auth errors ─────────────────────────────────────────────

export function notAuthenticated(): McpErrorContent {
  return errorContent(
    'Not authenticated. Provide a Flowershow Personal Access Token (PAT) via the Authorization header in your MCP client config.',
  );
}

export function tokenInvalid(): McpErrorContent {
  return errorContent(
    'Token is invalid or has been revoked. Check your Flowershow PAT in your MCP client config.',
  );
}

// ── Site errors ─────────────────────────────────────────────

export function siteNotFound(siteId: string): McpErrorContent {
  return errorContent(`Site not found: ${siteId}`);
}

export function siteAlreadyExists(name: string): McpErrorContent {
  return errorContent(
    `A site named "${name}" already exists. Use a different name or pass overwrite: true.`,
  );
}

// ── File / upload errors ────────────────────────────────────

export function fileTooLarge(path: string, maxMb: number): McpErrorContent {
  return errorContent(`File "${path}" exceeds the ${maxMb} MB per-file limit.`);
}

export function totalSizeExceeded(maxMb: number): McpErrorContent {
  return errorContent(`Total upload size exceeds the ${maxMb} MB site limit.`);
}

export function uploadFailed(path: string, reason?: string): McpErrorContent {
  return errorContent(
    `Upload failed for "${path}"${reason ? `: ${reason}` : ''}.`,
  );
}

// ── Generic API errors ──────────────────────────────────────

export function apiError(statusCode: number, message: string): McpErrorContent {
  return errorContent(`Flowershow API error (${statusCode}): ${message}`);
}

export function networkError(message: string): McpErrorContent {
  return errorContent(
    `Network error communicating with Flowershow API: ${message}`,
  );
}

export function unexpectedError(message: string): McpErrorContent {
  return errorContent(`Unexpected error: ${message}`);
}
