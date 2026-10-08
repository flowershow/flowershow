import { describe, expect, it } from 'vitest';
import { resolvePageChrome } from './page-chrome';

describe('resolvePageChrome', () => {
  it('hides nothing by default', () => {
    expect(resolvePageChrome(null, null)).toEqual({
      hideNavbar: false,
      hideFooter: false,
    });
    expect(resolvePageChrome(undefined, undefined)).toEqual({
      hideNavbar: false,
      hideFooter: false,
    });
  });

  it('hides the navbar and/or footer when the page sets showX: false', () => {
    expect(resolvePageChrome({ showNavbar: false }, null)).toEqual({
      hideNavbar: true,
      hideFooter: false,
    });
    expect(resolvePageChrome({ showFooter: false }, null)).toEqual({
      hideNavbar: false,
      hideFooter: true,
    });
    expect(
      resolvePageChrome({ showNavbar: false, showFooter: false }, null),
    ).toEqual({ hideNavbar: true, hideFooter: true });
  });

  it('falls back to the site config', () => {
    expect(
      resolvePageChrome(null, { showNavbar: false, showFooter: false }),
    ).toEqual({ hideNavbar: true, hideFooter: true });
    expect(resolvePageChrome({}, { showFooter: false })).toEqual({
      hideNavbar: false,
      hideFooter: true,
    });
  });

  it('lets the page override the site config', () => {
    expect(
      resolvePageChrome(
        { showNavbar: true, showFooter: true },
        { showNavbar: false, showFooter: false },
      ),
    ).toEqual({ hideNavbar: false, hideFooter: false });
    expect(
      resolvePageChrome({ showFooter: false }, { showFooter: true }),
    ).toEqual({ hideNavbar: false, hideFooter: true });
  });

  it('only treats the boolean false as hide', () => {
    for (const value of ['false', 0, null, 'no', {}]) {
      expect(
        resolvePageChrome(
          { showNavbar: value, showFooter: value } as never,
          null,
        ),
      ).toEqual({ hideNavbar: false, hideFooter: false });
    }
  });
});
