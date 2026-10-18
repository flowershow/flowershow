import { env } from '@/env.mjs';

/**
 * MCP OAuth authorization server settings (flowershow-3fr). Design:
 * docs/plans/2026-10-18-mcp-oauth-design.md.
 */

/** The single scope: list own sites, create sites, publish to and claim sites. */
export const SCOPE_SITES_WRITE = 'sites:write';
export const SUPPORTED_SCOPES = [SCOPE_SITES_WRITE] as const;

export const ACCESS_TOKEN_PREFIX = 'fs_oat_';
export const REFRESH_TOKEN_PREFIX = 'fs_ort_';

export const ACCESS_TOKEN_TTL_S = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL_S = 30 * 24 * 60 * 60; // 30 days
export const AUTH_CODE_TTL_S = 60;
export const PENDING_REQUEST_TTL_S = 10 * 60;
export const CIMD_CACHE_TTL_S = 24 * 60 * 60;

/** True when the authorization server is switched on (MCP_OAUTH_ENABLED=true). */
export function oauthEnabled(): boolean {
  return env.MCP_OAUTH_ENABLED === 'true';
}

function protocol(): 'https' | 'http' {
  return env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview'
    ? 'https'
    : 'http';
}

/** Issuer (RFC 8414): the home domain origin, e.g. https://flowershow.app. */
export function oauthIssuer(): string {
  return `${protocol()}://${env.NEXT_PUBLIC_HOME_DOMAIN}`;
}

/** Origin of the cloud app, where the consent page and login live. */
export function cloudOrigin(): string {
  return `${protocol()}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`;
}

/** The signed-in MCP endpoint: the default token audience. */
export function accountResource(): string {
  return `${oauthIssuer()}/api/mcp/account`;
}

/** The anonymous-first MCP endpoint, which also accepts bearer tokens. */
export function anonResource(): string {
  return `${oauthIssuer()}/api/mcp`;
}

/** Every resource (RFC 8707) a token may be issued for. */
export function allowedResources(): string[] {
  return [accountResource(), anonResource()];
}
