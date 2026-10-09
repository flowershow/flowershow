import { describe, expect, it } from 'vitest';
import {
  isSiteChromeFile,
  SITE_CHROME_FILES,
  SITE_FOOTER_PATH,
  SITE_NAVBAR_PATH,
} from './site-files';

describe('SITE_CHROME_FILES', () => {
  it('exposes the footer path constant as an html file', () => {
    expect(SITE_FOOTER_PATH).toBe('_footer.html');
  });

  it('exposes the navbar path constant as an html file', () => {
    expect(SITE_NAVBAR_PATH).toBe('_navbar.html');
  });

  it('includes the footer and the navbar', () => {
    expect(SITE_CHROME_FILES).toEqual([SITE_FOOTER_PATH, SITE_NAVBAR_PATH]);
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
  it.each([
    '_footer.html',
    '/_footer.html',
    '_navbar.html',
    '/_navbar.html',
  ])('matches %s', (path) => {
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
    '_navbar.md',
    '_Navbar.html',
    'docs/_navbar.html',
    '_nav.html',
    '_header.html',
    'navbar.html',
    '',
  ])('does not match %s', (path) => {
    expect(isSiteChromeFile(path)).toBe(false);
  });
});
