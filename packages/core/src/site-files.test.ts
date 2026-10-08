import { describe, expect, it } from 'vitest';
import {
  isSiteChromeFile,
  SITE_CHROME_FILES,
  SITE_FOOTER_PATH,
} from './site-files';

describe('SITE_CHROME_FILES', () => {
  it('exposes the footer path constant as an html file', () => {
    expect(SITE_FOOTER_PATH).toBe('_footer.html');
  });

  it('is a non-empty list that includes the footer', () => {
    expect(SITE_CHROME_FILES.length).toBeGreaterThan(0);
    expect(SITE_CHROME_FILES).toContain(SITE_FOOTER_PATH);
  });

  it('lists only root-level .html paths without a leading slash', () => {
    for (const path of SITE_CHROME_FILES) {
      expect(path.startsWith('/')).toBe(false);
      expect(path.includes('/')).toBe(false);
      expect(path.endsWith('.html')).toBe(true);
      expect(isSiteChromeFile(path)).toBe(true);
      expect(isSiteChromeFile(`/${path}`)).toBe(true);
    }
  });
});

describe('isSiteChromeFile', () => {
  it.each(['_footer.html', '/_footer.html'])('matches %s', (path) => {
    expect(isSiteChromeFile(path)).toBe(true);
  });

  it.each([
    '_footer.md',
    '/_footer.md',
    '_Footer.html',
    '_footer.HTML',
    'docs/_footer.html',
    '/docs/_footer.html',
    '_footer.htm',
    'footer.html',
    '_footer',
    '',
  ])('does not match %s', (path) => {
    expect(isSiteChromeFile(path)).toBe(false);
  });
});
