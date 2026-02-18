import { describe, expect, test } from 'vitest';
import { generateOpenApiDocument } from '../openapi.js';

describe('GitHub App routes', () => {
  test('registers /api/github-app/installations GET endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/github-app/installations']?.get).toBeDefined();
    expect(doc.paths?.['/api/github-app/installations']?.get?.operationId).toBe(
      'listInstallations',
    );
  });

  test('listInstallations requires sessionCookie security', () => {
    const doc = generateOpenApiDocument();
    const security =
      doc.paths?.['/api/github-app/installations']?.get?.security;
    expect(security).toEqual([{ sessionCookie: [] }]);
  });

  test('registers /api/github-app/installations/{id} DELETE endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(
      doc.paths?.['/api/github-app/installations/{id}']?.delete,
    ).toBeDefined();
    expect(
      doc.paths?.['/api/github-app/installations/{id}']?.delete?.operationId,
    ).toBe('deleteInstallation');
  });

  test('registers /api/github-app/installation-url POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/github-app/installation-url']?.post).toBeDefined();
    expect(
      doc.paths?.['/api/github-app/installation-url']?.post?.operationId,
    ).toBe('getInstallationUrl');
  });

  test('registers /api/github-app/sync-repositories POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(
      doc.paths?.['/api/github-app/sync-repositories']?.post,
    ).toBeDefined();
    expect(
      doc.paths?.['/api/github-app/sync-repositories']?.post?.operationId,
    ).toBe('syncRepositories');
  });

  test('registers /api/github-app/callback GET endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/github-app/callback']?.get).toBeDefined();
    expect(doc.paths?.['/api/github-app/callback']?.get?.operationId).toBe(
      'githubAppCallback',
    );
  });

  test('githubAppCallback has no security requirement', () => {
    const doc = generateOpenApiDocument();
    const security = doc.paths?.['/api/github-app/callback']?.get?.security;
    expect(security).toEqual([]);
  });

  test('registers /api/github-app/callback-success GET endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/github-app/callback-success']?.get).toBeDefined();
    expect(
      doc.paths?.['/api/github-app/callback-success']?.get?.operationId,
    ).toBe('githubAppCallbackSuccess');
  });
});
