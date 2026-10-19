import { isAllowedRedirectUri, parseScope } from './params';

/**
 * Validation of client metadata, shared by Dynamic Client Registration
 * (RFC 7591) and Client ID Metadata Documents (CIMD,
 * draft-ietf-oauth-client-id-metadata-document). Public clients only.
 */

export type ClientMetadata = {
  name: string;
  uri: string | null;
  logoUri: string | null;
  redirectUris: string[];
};

export type MetadataResult =
  | { ok: true; metadata: ClientMetadata }
  | {
      ok: false;
      error: 'invalid_redirect_uri' | 'invalid_client_metadata';
      description: string;
    };

const MAX_REDIRECT_URIS = 10;
const MAX_NAME = 100;

function invalid(description: string): MetadataResult {
  return { ok: false, error: 'invalid_client_metadata', description };
}

function optionalHttpsUrl(v: unknown): string | null | undefined {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || v.length > 2000) return undefined;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Collapse whitespace and strip control characters from a display name. */
export function cleanClientName(name: string): string {
  return (
    name
      // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters
      .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_NAME)
  );
}

/** Validate the client metadata fields we use or must refuse. */
export function validateClientMetadata(raw: unknown): MetadataResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return invalid('Client metadata must be a JSON object');
  }
  const m = raw as Record<string, unknown>;

  const uris = m.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0) {
    return {
      ok: false,
      error: 'invalid_redirect_uri',
      description: 'redirect_uris is required',
    };
  }
  if (uris.length > MAX_REDIRECT_URIS) {
    return {
      ok: false,
      error: 'invalid_redirect_uri',
      description: 'Too many redirect_uris',
    };
  }
  for (const u of uris) {
    if (!isAllowedRedirectUri(u)) {
      return {
        ok: false,
        error: 'invalid_redirect_uri',
        description:
          'redirect_uris must be https URLs, or http://localhost / http://127.0.0.1 loopback URLs, without fragments',
      };
    }
  }

  // Public clients only: no client secrets, no client authentication.
  const authMethod = m.token_endpoint_auth_method;
  if (authMethod !== undefined && authMethod !== 'none') {
    return invalid(
      'Only public clients are supported (token_endpoint_auth_method "none")',
    );
  }
  if (
    m.client_secret !== undefined ||
    m.client_secret_expires_at !== undefined
  ) {
    return invalid('Client secrets are not supported');
  }

  const grantTypes = m.grant_types;
  if (grantTypes !== undefined) {
    if (
      !Array.isArray(grantTypes) ||
      !grantTypes.every(
        (g) => g === 'authorization_code' || g === 'refresh_token',
      )
    ) {
      return invalid(
        'Only the authorization_code and refresh_token grant types are supported',
      );
    }
  }
  const responseTypes = m.response_types;
  if (responseTypes !== undefined) {
    if (
      !Array.isArray(responseTypes) ||
      !responseTypes.every((r) => r === 'code')
    ) {
      return invalid('Only the "code" response type is supported');
    }
  }
  if (m.scope !== undefined && !parseScope(m.scope).ok) {
    return invalid('Unsupported scope');
  }

  const rawName = m.client_name;
  if (rawName !== undefined && typeof rawName !== 'string') {
    return invalid('client_name must be a string');
  }
  const uri = optionalHttpsUrl(m.client_uri);
  const logoUri = optionalHttpsUrl(m.logo_uri);
  if (uri === undefined) return invalid('client_uri must be an https URL');
  if (logoUri === undefined) return invalid('logo_uri must be an https URL');

  const name = cleanClientName(typeof rawName === 'string' ? rawName : '');
  return {
    ok: true,
    metadata: {
      name: name || 'Unnamed app',
      uri,
      logoUri,
      redirectUris: [...new Set(uris as string[])],
    },
  };
}

/**
 * Whether a client_id is a CIMD URL (RFC draft §3): https, a path, no
 * fragment, no credentials, no dot segments.
 */
export function isCimdClientId(clientId: string): boolean {
  if (!clientId.startsWith('https://') || clientId.length > 2000) return false;
  let url: URL;
  try {
    url = new URL(clientId);
  } catch {
    return false;
  }
  if (clientId.includes('#') || url.username || url.password) return false;
  if (url.pathname === '/' || url.pathname === '') return false;
  if (/\/\.\.?(\/|$)/.test(clientId.slice(url.origin.length))) return false;
  // Must be canonical: what we fetch is exactly what the document must name.
  return url.href === clientId;
}

/**
 * Validate a fetched CIMD document: its client_id must equal the URL it was
 * fetched from, then the usual metadata rules.
 */
export function validateCimdDocument(
  url: string,
  doc: unknown,
): MetadataResult {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return invalid('Client metadata document must be a JSON object');
  }
  if ((doc as Record<string, unknown>).client_id !== url) {
    return invalid('client_id in the metadata document does not match its URL');
  }
  return validateClientMetadata(doc);
}
