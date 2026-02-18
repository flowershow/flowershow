import { describe, expect, test } from 'vitest';
import { generateOpenApiDocument } from '../openapi.js';

describe('User routes', () => {
  test('registers /api/user GET endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/user']).toBeDefined();
    expect(doc.paths?.['/api/user']?.get).toBeDefined();
    expect(doc.paths?.['/api/user']?.get?.operationId).toBe('getUser');
  });

  test('getUser accepts both bearerToken and sessionCookie security', () => {
    const doc = generateOpenApiDocument();
    const security = doc.paths?.['/api/user']?.get?.security;
    expect(security).toBeDefined();
    expect(security).toEqual(
      expect.arrayContaining([{ bearerToken: [] }, { sessionCookie: [] }]),
    );
  });

  test('getUser returns User on success', () => {
    const doc = generateOpenApiDocument();
    const response = doc.paths?.['/api/user']?.get?.responses?.['200'];
    expect(response).toBeDefined();
  });
});

describe('Token routes', () => {
  test('registers /api/tokens/revoke POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/tokens/revoke']).toBeDefined();
    expect(doc.paths?.['/api/tokens/revoke']?.post).toBeDefined();
    expect(doc.paths?.['/api/tokens/revoke']?.post?.operationId).toBe(
      'revokeToken',
    );
  });

  test('revokeToken requires sessionCookie security', () => {
    const doc = generateOpenApiDocument();
    const security = doc.paths?.['/api/tokens/revoke']?.post?.security;
    expect(security).toEqual([{ sessionCookie: [] }]);
  });

  test('revokeToken returns success response', () => {
    const doc = generateOpenApiDocument();
    const response =
      doc.paths?.['/api/tokens/revoke']?.post?.responses?.['200'];
    expect(response).toBeDefined();
  });
});
