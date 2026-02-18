import { describe, expect, test } from 'vitest';
import { generateOpenApiDocument } from './openapi.js';

describe('OpenAPI Document Integration', () => {
  const doc = generateOpenApiDocument();

  describe('Server configuration', () => {
    test('has production server URL', () => {
      expect(doc.servers).toBeDefined();
      expect(doc.servers).toHaveLength(1);
      expect(doc.servers![0].url).toBe('https://flowershow.app');
      expect(doc.servers![0].description).toBe('Production');
    });
  });

  describe('Security schemes', () => {
    test('has all 4 security schemes', () => {
      const schemes = Object.keys(doc.components?.securitySchemes ?? {});
      expect(schemes).toHaveLength(4);
      expect(schemes).toContain('bearerToken');
      expect(schemes).toContain('sessionCookie');
      expect(schemes).toContain('githubWebhookSignature');
      expect(schemes).toContain('stripeWebhookSignature');
    });
  });

  describe('Tags', () => {
    test('has all 9 tags with descriptions', () => {
      expect(doc.tags).toHaveLength(9);
      const tagNames = doc.tags?.map((t) => t.name) ?? [];
      expect(tagNames).toEqual([
        'CLI Auth',
        'User',
        'Sites',
        'Anonymous Publishing',
        'Site Access',
        'GitHub App',
        'Webhooks',
        'Domain',
        'SEO',
      ]);
    });
  });

  describe('Paths count', () => {
    test('has all expected paths', () => {
      const paths = Object.keys(doc.paths ?? {});
      expect(paths.length).toBe(27);
    });
  });

  describe('CLI Auth paths', () => {
    test('/api/cli/device/authorize POST', () => {
      expect(doc.paths?.['/api/cli/device/authorize']?.post).toBeDefined();
    });
    test('/api/cli/device/token POST', () => {
      expect(doc.paths?.['/api/cli/device/token']?.post).toBeDefined();
    });
    test('/api/cli/authorize POST', () => {
      expect(doc.paths?.['/api/cli/authorize']?.post).toBeDefined();
    });
  });

  describe('User paths', () => {
    test('/api/user GET', () => {
      expect(doc.paths?.['/api/user']?.get).toBeDefined();
    });
    test('/api/tokens/revoke POST', () => {
      expect(doc.paths?.['/api/tokens/revoke']?.post).toBeDefined();
    });
  });

  describe('Sites paths', () => {
    test('/api/sites POST', () => {
      expect(doc.paths?.['/api/sites']?.post).toBeDefined();
    });
    test('/api/sites GET', () => {
      expect(doc.paths?.['/api/sites']?.get).toBeDefined();
    });
    test('/api/sites/id/{siteId} GET', () => {
      expect(doc.paths?.['/api/sites/id/{siteId}']?.get).toBeDefined();
    });
    test('/api/sites/id/{siteId} DELETE', () => {
      expect(doc.paths?.['/api/sites/id/{siteId}']?.delete).toBeDefined();
    });
    test('/api/sites/id/{siteId}/sync POST', () => {
      expect(doc.paths?.['/api/sites/id/{siteId}/sync']?.post).toBeDefined();
    });
    test('/api/sites/id/{siteId}/files POST', () => {
      expect(doc.paths?.['/api/sites/id/{siteId}/files']?.post).toBeDefined();
    });
    test('/api/sites/id/{siteId}/files DELETE', () => {
      expect(doc.paths?.['/api/sites/id/{siteId}/files']?.delete).toBeDefined();
    });
    test('/api/sites/id/{siteId}/status GET', () => {
      expect(doc.paths?.['/api/sites/id/{siteId}/status']?.get).toBeDefined();
    });
  });

  describe('Anonymous Publishing paths', () => {
    test('/api/sites/publish-anon POST', () => {
      expect(doc.paths?.['/api/sites/publish-anon']?.post).toBeDefined();
    });
    test('/api/sites/claim POST', () => {
      expect(doc.paths?.['/api/sites/claim']?.post).toBeDefined();
    });
  });

  describe('Site Access paths', () => {
    test('/api/sites/id/{siteId}/login POST', () => {
      expect(doc.paths?.['/api/sites/id/{siteId}/login']?.post).toBeDefined();
    });
    test('/api/sites/id/{siteId}/logout POST', () => {
      expect(doc.paths?.['/api/sites/id/{siteId}/logout']?.post).toBeDefined();
    });
  });

  describe('Site Lookup path', () => {
    test('/api/sites/{username}/{projectname} GET', () => {
      expect(
        doc.paths?.['/api/sites/{username}/{projectname}']?.get,
      ).toBeDefined();
    });
  });

  describe('GitHub App paths', () => {
    test('/api/github-app/installations GET', () => {
      expect(doc.paths?.['/api/github-app/installations']?.get).toBeDefined();
    });
    test('/api/github-app/installations/{id} DELETE', () => {
      expect(
        doc.paths?.['/api/github-app/installations/{id}']?.delete,
      ).toBeDefined();
    });
    test('/api/github-app/installation-url POST', () => {
      expect(
        doc.paths?.['/api/github-app/installation-url']?.post,
      ).toBeDefined();
    });
    test('/api/github-app/sync-repositories POST', () => {
      expect(
        doc.paths?.['/api/github-app/sync-repositories']?.post,
      ).toBeDefined();
    });
    test('/api/github-app/callback GET', () => {
      expect(doc.paths?.['/api/github-app/callback']?.get).toBeDefined();
    });
    test('/api/github-app/callback-success GET', () => {
      expect(
        doc.paths?.['/api/github-app/callback-success']?.get,
      ).toBeDefined();
    });
  });

  describe('Webhooks paths', () => {
    test('/api/webhooks/github-app POST', () => {
      expect(doc.paths?.['/api/webhooks/github-app']?.post).toBeDefined();
    });
    test('/api/webhook POST (deprecated)', () => {
      expect(doc.paths?.['/api/webhook']?.post).toBeDefined();
      expect(doc.paths?.['/api/webhook']?.post?.deprecated).toBe(true);
    });
    test('/api/stripe/webhook POST', () => {
      expect(doc.paths?.['/api/stripe/webhook']?.post).toBeDefined();
    });
  });

  describe('Domain path', () => {
    test('/api/domain/{domain}/verify GET', () => {
      expect(doc.paths?.['/api/domain/{domain}/verify']?.get).toBeDefined();
    });
  });

  describe('SEO paths', () => {
    test('/api/sitemap/{user}/{project} GET', () => {
      expect(doc.paths?.['/api/sitemap/{user}/{project}']?.get).toBeDefined();
    });
    test('/api/robots/{hostname} GET', () => {
      expect(doc.paths?.['/api/robots/{hostname}']?.get).toBeDefined();
    });
  });
});
