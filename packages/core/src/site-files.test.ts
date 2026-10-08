import { describe, expect, it } from 'vitest';
import {
  isSiteChromeFile,
  SITE_CHROME_FILES,
  SITE_FOOTER_PATH,
} from './site-files';

describe('isSiteChromeFile', () => {
  it('exposes the footer path constant', () => {
    expect(SITE_FOOTER_PATH).toBe('_footer.md');
  });

  it('lists every chrome file, footer included, without a leading slash', () => {
    expect(SITE_CHROME_FILES).toContain(SITE_FOOTER_PATH);
    for (const path of SITE_CHROME_FILES) {
      expect(path.startsWith('/')).toBe(false);
      expect(isSiteChromeFile(path)).toBe(true);
      expect(isSiteChromeFile(`/${path}`)).toBe(true);
    }
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
