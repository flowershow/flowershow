import { describe, expect, it } from 'vitest';
import { isAnnotationsEnabled } from './enabled';

const claimedSite = { isTemporary: false, anonymousOwnerId: null };
const md = 'notes/draft.md';
const siteOn = { annotations: true };

describe('isAnnotationsEnabled', () => {
  it('is off by default', () => {
    expect(
      isAnnotationsEnabled({
        site: claimedSite,
        siteConfig: {},
        pageMetadata: {},
        pagePath: md,
      }),
    ).toBe(false);
    expect(
      isAnnotationsEnabled({
        site: claimedSite,
        siteConfig: null,
        pageMetadata: null,
        pagePath: md,
      }),
    ).toBe(false);
  });

  it('is on for every Markdown page when the site setting is on', () => {
    expect(
      isAnnotationsEnabled({
        site: claimedSite,
        siteConfig: siteOn,
        pageMetadata: {},
        pagePath: md,
      }),
    ).toBe(true);
  });

  it('treats site-level off as final, even when frontmatter says true', () => {
    expect(
      isAnnotationsEnabled({
        site: claimedSite,
        siteConfig: {},
        pageMetadata: { annotations: true },
        pagePath: md,
      }),
    ).toBe(false);
    expect(
      isAnnotationsEnabled({
        site: claimedSite,
        siteConfig: { annotations: false },
        pageMetadata: { annotations: true },
        pagePath: md,
      }),
    ).toBe(false);
  });

  it('lets a page opt out with annotations: false', () => {
    expect(
      isAnnotationsEnabled({
        site: claimedSite,
        siteConfig: siteOn,
        pageMetadata: { annotations: false },
        pagePath: md,
      }),
    ).toBe(false);
  });

  it('ignores non-boolean frontmatter values', () => {
    expect(
      isAnnotationsEnabled({
        site: claimedSite,
        siteConfig: siteOn,
        pageMetadata: { annotations: 'no' },
        pagePath: md,
      }),
    ).toBe(true);
  });

  it('only allows Markdown pages', () => {
    for (const pagePath of ['report.html', 'board.canvas', 'data.csv']) {
      expect(
        isAnnotationsEnabled({
          site: claimedSite,
          siteConfig: siteOn,
          pageMetadata: {},
          pagePath,
        }),
      ).toBe(false);
    }
    expect(
      isAnnotationsEnabled({
        site: claimedSite,
        siteConfig: siteOn,
        pageMetadata: {},
        pagePath: 'blog/index.MDX',
      }),
    ).toBe(true);
  });

  it('is never on for an unclaimed anonymous site', () => {
    expect(
      isAnnotationsEnabled({
        site: { isTemporary: true, anonymousOwnerId: 'anon-owner-1' },
        siteConfig: siteOn,
        pageMetadata: {},
        pagePath: md,
      }),
    ).toBe(false);
  });
});
