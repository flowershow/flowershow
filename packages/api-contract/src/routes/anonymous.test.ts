import { describe, expect, test } from 'vitest';
import { generateOpenApiDocument } from '../openapi.js';

describe('Anonymous Publishing routes', () => {
  test('registers /api/sites/publish-anon POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sites/publish-anon']?.post).toBeDefined();
    expect(doc.paths?.['/api/sites/publish-anon']?.post?.operationId).toBe(
      'publishAnonymous',
    );
  });

  test('publishAnonymous has no security requirement', () => {
    const doc = generateOpenApiDocument();
    const security = doc.paths?.['/api/sites/publish-anon']?.post?.security;
    expect(security).toEqual([]);
  });

  test('registers /api/sites/claim POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sites/claim']?.post).toBeDefined();
    expect(doc.paths?.['/api/sites/claim']?.post?.operationId).toBe(
      'claimSite',
    );
  });

  test('claimSite requires sessionCookie security', () => {
    const doc = generateOpenApiDocument();
    const security = doc.paths?.['/api/sites/claim']?.post?.security;
    expect(security).toEqual([{ sessionCookie: [] }]);
  });
});

describe('Site Access routes', () => {
  test('registers /api/sites/id/{siteId}/login POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sites/id/{siteId}/login']?.post).toBeDefined();
    expect(doc.paths?.['/api/sites/id/{siteId}/login']?.post?.operationId).toBe(
      'siteLogin',
    );
  });

  test('siteLogin has no security requirement', () => {
    const doc = generateOpenApiDocument();
    const security =
      doc.paths?.['/api/sites/id/{siteId}/login']?.post?.security;
    expect(security).toEqual([]);
  });

  test('registers /api/sites/id/{siteId}/logout POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sites/id/{siteId}/logout']?.post).toBeDefined();
    expect(
      doc.paths?.['/api/sites/id/{siteId}/logout']?.post?.operationId,
    ).toBe('siteLogout');
  });
});

describe('Site Lookup route', () => {
  test('registers /api/sites/{username}/{projectname} GET endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(
      doc.paths?.['/api/sites/{username}/{projectname}']?.get,
    ).toBeDefined();
    expect(
      doc.paths?.['/api/sites/{username}/{projectname}']?.get?.operationId,
    ).toBe('lookupSite');
  });

  test('lookupSite accepts optional bearerToken security', () => {
    const doc = generateOpenApiDocument();
    const security =
      doc.paths?.['/api/sites/{username}/{projectname}']?.get?.security;
    expect(security).toBeDefined();
    expect(security).toEqual(expect.arrayContaining([{ bearerToken: [] }, {}]));
  });
});
