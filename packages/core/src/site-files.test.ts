import { describe, expect, it } from 'vitest';
import { isSiteChromeFile, SITE_FOOTER_PATH } from './site-files';

describe('isSiteChromeFile', () => {
  it('exposes the footer path constant', () => {
    expect(SITE_FOOTER_PATH).toBe('_footer.md');
  });

  it.each(['_footer.md', '/_footer.md'])('matches %s', (path) => {
    expect(isSiteChromeFile(path)).toBe(true);
  });

  it.each([
    '_Footer.md',
    'docs/_footer.md',
    '/docs/_footer.md',
    '_footer.mdx',
    'footer.md',
    '_footer',
    '',
  ])('does not match %s', (path) => {
    expect(isSiteChromeFile(path)).toBe(false);
  });
});
