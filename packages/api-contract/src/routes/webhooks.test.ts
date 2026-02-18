import { describe, expect, test } from 'vitest';
import { generateOpenApiDocument } from '../openapi.js';

describe('Webhooks routes', () => {
  test('registers /api/webhooks/github-app POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/webhooks/github-app']?.post).toBeDefined();
    expect(doc.paths?.['/api/webhooks/github-app']?.post?.operationId).toBe(
      'githubAppWebhook',
    );
  });

  test('githubAppWebhook requires githubWebhookSignature security', () => {
    const doc = generateOpenApiDocument();
    const security = doc.paths?.['/api/webhooks/github-app']?.post?.security;
    expect(security).toEqual([{ githubWebhookSignature: [] }]);
  });

  test('registers /api/webhook POST endpoint (legacy)', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/webhook']?.post).toBeDefined();
    expect(doc.paths?.['/api/webhook']?.post?.operationId).toBe(
      'legacyWebhook',
    );
  });

  test('legacyWebhook is marked deprecated', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/webhook']?.post?.deprecated).toBe(true);
  });

  test('registers /api/stripe/webhook POST endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/stripe/webhook']?.post).toBeDefined();
    expect(doc.paths?.['/api/stripe/webhook']?.post?.operationId).toBe(
      'stripeWebhook',
    );
  });

  test('stripeWebhook requires stripeWebhookSignature security', () => {
    const doc = generateOpenApiDocument();
    const security = doc.paths?.['/api/stripe/webhook']?.post?.security;
    expect(security).toEqual([{ stripeWebhookSignature: [] }]);
  });
});

describe('Domain routes', () => {
  test('registers /api/domain/{domain}/verify GET endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/domain/{domain}/verify']?.get).toBeDefined();
    expect(doc.paths?.['/api/domain/{domain}/verify']?.get?.operationId).toBe(
      'verifyDomain',
    );
  });

  test('verifyDomain has no security requirement', () => {
    const doc = generateOpenApiDocument();
    const security = doc.paths?.['/api/domain/{domain}/verify']?.get?.security;
    expect(security).toEqual([]);
  });
});

describe('SEO routes', () => {
  test('registers /api/sitemap/{user}/{project} GET endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/sitemap/{user}/{project}']?.get).toBeDefined();
    expect(doc.paths?.['/api/sitemap/{user}/{project}']?.get?.operationId).toBe(
      'getSitemap',
    );
  });

  test('getSitemap has no security requirement', () => {
    const doc = generateOpenApiDocument();
    const security =
      doc.paths?.['/api/sitemap/{user}/{project}']?.get?.security;
    expect(security).toEqual([]);
  });

  test('registers /api/robots/{hostname} GET endpoint', () => {
    const doc = generateOpenApiDocument();
    expect(doc.paths?.['/api/robots/{hostname}']?.get).toBeDefined();
    expect(doc.paths?.['/api/robots/{hostname}']?.get?.operationId).toBe(
      'getRobotsTxt',
    );
  });
});
