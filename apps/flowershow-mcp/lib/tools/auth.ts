import type { FlowershowApiClient } from '../api-client';
import { ApiClientError } from '../api-client';
import * as tokenStore from '../token-store';
import * as errors from '../errors';

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

function text(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }] };
}

function error(content: { type: 'text'; text: string }): ToolResult {
  return { content: [content], isError: true };
}

// ── auth_start ──────────────────────────────────────────────

export async function handleAuthStart(
  client: FlowershowApiClient,
): Promise<ToolResult> {
  // If already authenticated, confirm it
  const existingToken = tokenStore.getToken();
  if (existingToken) {
    try {
      const user = await client.getUser(existingToken);
      return text(
        `You are already authenticated as ${user.username}${user.email ? ` (${user.email})` : ''}. Use auth_logout to sign out first.`,
      );
    } catch {
      // Token invalid, proceed with new auth
      tokenStore.clearToken();
    }
  }

  try {
    const authResponse = await client.deviceAuthorize();
    tokenStore.setDeviceCode(authResponse.device_code);

    return text(
      [
        `To authenticate, please visit:`,
        ``,
        `  ${authResponse.verification_uri_complete}`,
        ``,
        `Or go to ${authResponse.verification_uri} and enter code: ${authResponse.user_code}`,
        ``,
        `The code expires in ${Math.floor(authResponse.expires_in / 60)} minutes.`,
        `After approving, call auth_status to complete login.`,
      ].join('\n'),
    );
  } catch (e) {
    if (e instanceof ApiClientError) {
      return error(errors.apiError(e.statusCode, String(e.body)));
    }
    return error(
      errors.networkError(e instanceof Error ? e.message : String(e)),
    );
  }
}

// ── auth_status ─────────────────────────────────────────────

export async function handleAuthStatus(
  client: FlowershowApiClient,
): Promise<ToolResult> {
  // Already have a token
  const existingToken = tokenStore.getToken();
  if (existingToken) {
    try {
      const user = await client.getUser(existingToken);
      return text(
        `Authenticated as ${user.username}${user.email ? ` (${user.email})` : ''}.`,
      );
    } catch {
      tokenStore.clearToken();
      return error(errors.tokenRevoked());
    }
  }

  // Check device code polling
  const deviceCode = tokenStore.getDeviceCode();
  if (!deviceCode) {
    return error(errors.notAuthenticated());
  }

  try {
    const tokenResponse = await client.deviceToken(deviceCode);

    if ('error' in tokenResponse) {
      return text(
        'Authorization is still pending. The user has not yet approved the device code. Call auth_status again after a few seconds.',
      );
    }

    // Success - store the token
    tokenStore.setToken(tokenResponse.access_token);
    tokenStore.clearDeviceCode();

    try {
      const user = await client.getUser(tokenResponse.access_token);
      return text(
        `Successfully authenticated as ${user.username}${user.email ? ` (${user.email})` : ''}. You can now use all Flowershow tools.`,
      );
    } catch {
      return text(
        'Successfully authenticated. You can now use all Flowershow tools.',
      );
    }
  } catch (e) {
    if (e instanceof ApiClientError) {
      if (e.statusCode === 400) {
        return error(errors.authExpired());
      }
      return error(errors.apiError(e.statusCode, String(e.body)));
    }
    return error(
      errors.networkError(e instanceof Error ? e.message : String(e)),
    );
  }
}

// ── auth_logout ─────────────────────────────────────────────

export async function handleAuthLogout(): Promise<ToolResult> {
  const hadToken = tokenStore.getToken() !== null;
  tokenStore.clearToken();
  tokenStore.clearDeviceCode();

  if (hadToken) {
    return text('Successfully logged out. Use auth_start to sign in again.');
  }
  return text('You were not authenticated. Use auth_start to sign in.');
}
