import { describe, expect, test } from 'vitest';
import { generateOpenApiDocument } from '../openapi.js';

describe('Sites routes - createSite', () => {
  test('registers /api/sites POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sites']?.post).toBeDefined();
    expect(doc.paths?.['/api/sites']?.post?.operationId).toBe('createSite');
  });

  test('createSite requires bearerToken security', () => {
    const doc = generateOpenApiDocument();
    const security = doc.paths?.['/api/sites']?.post?.security;
    expect(security).toEqual([{ bearerToken: [] }]);
  });
});

describe('Sites routes - listSites', () => {
  test('registers /api/sites GET endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sites']?.get).toBeDefined();
    expect(doc.paths?.['/api/sites']?.get?.operationId).toBe('listSites');
  });

  test('listSites requires bearerToken security', () => {
    const doc = generateOpenApiDocument();
    const security = doc.paths?.['/api/sites']?.get?.security;
    expect(security).toEqual([{ bearerToken: [] }]);
  });
});

describe('Sites routes - getSite', () => {
  test('registers /api/sites/id/{siteId} GET endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sites/id/{siteId}']?.get).toBeDefined();
    expect(doc.paths?.['/api/sites/id/{siteId}']?.get?.operationId).toBe(
      'getSite',
    );
  });
});

describe('Sites routes - deleteSite', () => {
  test('registers /api/sites/id/{siteId} DELETE endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sites/id/{siteId}']?.delete).toBeDefined();
    expect(doc.paths?.['/api/sites/id/{siteId}']?.delete?.operationId).toBe(
      'deleteSite',
    );
  });
});

describe('Sites routes - syncSite', () => {
  test('registers /api/sites/id/{siteId}/sync POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sites/id/{siteId}/sync']?.post).toBeDefined();
    expect(doc.paths?.['/api/sites/id/{siteId}/sync']?.post?.operationId).toBe(
      'syncSite',
    );
  });
});

describe('Sites routes - publishFiles', () => {
  test('registers /api/sites/id/{siteId}/files POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sites/id/{siteId}/files']?.post).toBeDefined();
    expect(doc.paths?.['/api/sites/id/{siteId}/files']?.post?.operationId).toBe(
      'publishFiles',
    );
  });
});

describe('Sites routes - deleteFiles', () => {
  test('registers /api/sites/id/{siteId}/files DELETE endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sites/id/{siteId}/files']?.delete).toBeDefined();
    expect(
      doc.paths?.['/api/sites/id/{siteId}/files']?.delete?.operationId,
    ).toBe('deleteFiles');
  });
});

describe('Sites routes - getSiteStatus', () => {
  test('registers /api/sites/id/{siteId}/status GET endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sites/id/{siteId}/status']?.get).toBeDefined();
    expect(doc.paths?.['/api/sites/id/{siteId}/status']?.get?.operationId).toBe(
      'getSiteStatus',
    );
  });
});
