import { describe, expect, it } from 'vitest';
import { generateOpenApiDocument } from './openapi.js';

describe('generateOpenApiDocument', () => {
  it('returns a valid OpenAPI 3.1 document', () => {
    const doc = generateOpenApiDocument();
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info.title).toBe('Flowershow API');
    expect(doc.info.version).toBeDefined();
  });

  it('registers all schemas as components', () => {
    const doc = generateOpenApiDocument();
    const schemaNames = Object.keys(doc.components?.schemas ?? {});
    expect(schemaNames).toContain('SiteSummary');
    expect(schemaNames).toContain('ListSitesResponse');
    expect(schemaNames).toContain('SiteDetail');
    expect(schemaNames).toContain('User');
    expect(schemaNames).toContain('FileMetadata');
    expect(schemaNames).toContain('UploadTarget');
    expect(schemaNames).toContain('PublishFilesResponse');
    expect(schemaNames).toContain('StatusResponse');
  });

  it('SiteDetail schema has plan enum', () => {
    const doc = generateOpenApiDocument();
    const siteDetail = doc.components?.schemas?.['SiteDetail'] as Record<
      string,
      unknown
    >;
    expect(siteDetail).toBeDefined();
    const properties = siteDetail.properties as Record<
      string,
      Record<string, unknown>
    >;
    expect(properties.plan.enum).toEqual(['FREE', 'PREMIUM']);
  });
});
