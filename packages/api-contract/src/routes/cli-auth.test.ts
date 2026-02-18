import { describe, expect, test } from 'vitest';
import { generateOpenApiDocument } from '../openapi.js';

describe('CLI Auth routes', () => {
  test('registers /api/cli/device/authorize POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/cli/device/authorize']).toBeDefined();
    expect(doc.paths?.['/api/cli/device/authorize']?.post).toBeDefined();
    expect(doc.paths?.['/api/cli/device/authorize']?.post?.operationId).toBe(
      'deviceAuthorize',
    );
  });

  test('registers /api/cli/device/token POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/cli/device/token']).toBeDefined();
    expect(doc.paths?.['/api/cli/device/token']?.post).toBeDefined();
    expect(doc.paths?.['/api/cli/device/token']?.post?.operationId).toBe(
      'deviceToken',
    );
  });

  test('registers /api/cli/authorize POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/cli/authorize']).toBeDefined();
    expect(doc.paths?.['/api/cli/authorize']?.post).toBeDefined();
    expect(doc.paths?.['/api/cli/authorize']?.post?.operationId).toBe(
      'authorizeDevice',
    );
  });

  test('device authorize has no security requirement', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/cli/device/authorize']?.post?.security).toEqual(
      [],
    );
  });

  test('device authorize returns DeviceAuthorizeResponse on success', () => {
    const doc = generateOpenApiDocument();
    const response =
      doc.paths?.['/api/cli/device/authorize']?.post?.responses?.['200'];
    expect(response).toBeDefined();
  });
});

describe('Security schemes', () => {
  test('registers bearerToken security scheme', () => {
    const doc = generateOpenApiDocument();
    const scheme = doc.components?.securitySchemes?.bearerToken;
    expect(scheme).toBeDefined();
    if (scheme && 'type' in scheme) {
      expect(scheme.type).toBe('http');
      expect(scheme.scheme).toBe('bearer');
    }
  });

  test('registers sessionCookie security scheme', () => {
    const doc = generateOpenApiDocument();
    const scheme = doc.components?.securitySchemes?.sessionCookie;
    expect(scheme).toBeDefined();
    if (scheme && 'type' in scheme) {
      expect(scheme.type).toBe('apiKey');
      expect(scheme.in).toBe('cookie');
    }
  });

  test('registers githubWebhookSignature security scheme', () => {
    const doc = generateOpenApiDocument();
    const scheme = doc.components?.securitySchemes?.githubWebhookSignature;
    expect(scheme).toBeDefined();
    if (scheme && 'in' in scheme) {
      expect(scheme.in).toBe('header');
    }
  });

  test('registers stripeWebhookSignature security scheme', () => {
    const doc = generateOpenApiDocument();
    const scheme = doc.components?.securitySchemes?.stripeWebhookSignature;
    expect(scheme).toBeDefined();
    if (scheme && 'in' in scheme) {
      expect(scheme.in).toBe('header');
    }
  });
});

describe('Tags', () => {
  test('registers all required tags', () => {
    const doc = generateOpenApiDocument();
    const tagNames = doc.tags?.map((t) => t.name) ?? [];
    expect(tagNames).toContain('CLI Auth');
    expect(tagNames).toContain('User');
    expect(tagNames).toContain('Sites');
    expect(tagNames).toContain('Anonymous Publishing');
    expect(tagNames).toContain('Site Access');
    expect(tagNames).toContain('GitHub App');
    expect(tagNames).toContain('Webhooks');
    expect(tagNames).toContain('Domain');
    expect(tagNames).toContain('SEO');
  });
});
