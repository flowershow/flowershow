import { randomBytes } from 'node:crypto';
import type { OAuthClient } from '@prisma/client';
import prisma from '@/server/db';
import {
  isCimdClientId,
  validateCimdDocument,
  validateClientMetadata,
} from './client-metadata';
import { CIMD_CACHE_TTL_S } from './config';
import { SafeFetchError, safeFetch } from './safe-fetch';

/**
 * OAuth client lookup and registration: DCR clients live in the database;
 * CIMD clients (client_id is an https URL) are fetched and cached for 24h.
 */

export type ResolvedClient = Pick<
  OAuthClient,
  'id' | 'clientId' | 'kind' | 'name' | 'uri' | 'redirectUris'
>;

export type ResolveResult =
  | { ok: true; client: ResolvedClient }
  | { ok: false; description: string };

const SELECT = {
  id: true,
  clientId: true,
  kind: true,
  name: true,
  uri: true,
  redirectUris: true,
  metadataFetchedAt: true,
} as const;

export function generateDcrClientId(): string {
  return `dcr_${randomBytes(18).toString('base64url')}`;
}

/** RFC 7591 registration of a public client. */
export async function registerDcrClient(raw: unknown) {
  const result = validateClientMetadata(raw);
  if (!result.ok) return result;
  const { metadata } = result;
  const client = await prisma.oAuthClient.create({
    data: {
      clientId: generateDcrClientId(),
      kind: 'DCR',
      name: metadata.name,
      uri: metadata.uri,
      logoUri: metadata.logoUri,
      redirectUris: metadata.redirectUris,
    },
  });
  return { ok: true as const, client };
}

export type ResolveOptions = {
  now?: Date;
  fetch?: typeof safeFetch;
};

/**
 * Find a client by its public client_id. For a CIMD URL, (re)fetch the
 * metadata document when it isn't cached or the cache is older than 24h.
 * Fails closed: if a refetch fails, the stale copy is not used.
 */
export async function resolveClient(
  clientId: unknown,
  opts: ResolveOptions = {},
): Promise<ResolveResult> {
  const { now = new Date(), fetch = safeFetch } = opts;
  if (typeof clientId !== 'string' || !clientId || clientId.length > 2000) {
    return { ok: false, description: 'Missing or invalid client_id' };
  }

  if (!clientId.startsWith('https://')) {
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId },
      select: SELECT,
    });
    if (!client || client.kind !== 'DCR') {
      return { ok: false, description: 'Unknown client_id' };
    }
    return { ok: true, client };
  }

  if (!isCimdClientId(clientId)) {
    return { ok: false, description: 'Invalid client_id URL' };
  }
  const cached = await prisma.oAuthClient.findUnique({
    where: { clientId },
    select: SELECT,
  });
  if (
    cached?.kind === 'CIMD' &&
    cached.metadataFetchedAt &&
    now.getTime() - cached.metadataFetchedAt.getTime() < CIMD_CACHE_TTL_S * 1000
  ) {
    return { ok: true, client: cached };
  }

  let doc: unknown;
  try {
    const res = await fetch(clientId);
    if (
      res.contentType &&
      !/^application\/([\w.+-]*\+)?json\b/i.test(res.contentType)
    ) {
      return { ok: false, description: 'Client metadata document is not JSON' };
    }
    doc = JSON.parse(res.body);
  } catch (err) {
    const why =
      err instanceof SafeFetchError
        ? `Could not fetch the client metadata document (${err.reason})`
        : 'Client metadata document is not valid JSON';
    return { ok: false, description: why };
  }
  const result = validateCimdDocument(clientId, doc);
  if (!result.ok) return { ok: false, description: result.description };

  const { metadata } = result;
  const data = {
    kind: 'CIMD' as const,
    name: metadata.name,
    uri: metadata.uri,
    logoUri: metadata.logoUri,
    redirectUris: metadata.redirectUris,
    metadataFetchedAt: now,
  };
  const client = await prisma.oAuthClient.upsert({
    where: { clientId },
    create: { clientId, ...data },
    update: data,
    select: SELECT,
  });
  return { ok: true, client };
}
