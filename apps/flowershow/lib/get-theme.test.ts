import { describe, expect, it } from 'vitest';

import { getThemeUrl } from './get-theme';
import { OFFICIAL_THEMES } from './themes';

describe('getThemeUrl', () => {
  it('resolves bare Monospace to the ref that contains the official theme', () => {
    expect(getThemeUrl('monospace')).toBe(
      'https://cdn.jsdelivr.net/gh/flowershow/themes@main/monospace/theme.css',
    );
  });

  it('keeps explicit Monospace version pins authoritative', () => {
    expect(getThemeUrl('monospace@0.2.0')).toBe(
      'https://cdn.jsdelivr.net/gh/flowershow/themes@0.2.0/monospace/theme.css',
    );
  });

  it('keeps established bare themes on jsDelivr default resolution', () => {
    expect(getThemeUrl('letterpress')).toBe(
      'https://cdn.jsdelivr.net/gh/flowershow/themes/letterpress/theme.css',
    );
  });

  it.each(OFFICIAL_THEMES.map((t) => t.value))(
    'emits a stylesheet URL for official theme %s',
    (name) => {
      expect(getThemeUrl(name)).toMatch(
        new RegExp(
          `^https://cdn\\.jsdelivr\\.net/gh/flowershow/themes(@main)?/${name}/theme\\.css$`,
        ),
      );
    },
  );

  it('emits a stylesheet URL for material-draft, which exists in the themes repo', () => {
    expect(getThemeUrl('material-draft')).toBe(
      'https://cdn.jsdelivr.net/gh/flowershow/themes/material-draft/theme.css',
    );
  });

  // #1468: there is no `default/` folder in flowershow/themes, so emitting a
  // render-blocking <link> to it hangs every page while jsDelivr times out.
  it.each(['default', 'Default', ' default ', 'none', ''])(
    'emits no stylesheet for built-in/empty theme name %j',
    (name) => {
      expect(getThemeUrl(name)).toBeNull();
    },
  );

  it.each(['not-a-theme', 'dark', 'default/../leaf'])(
    'emits no stylesheet for unknown bare theme name %j',
    (name) => {
      expect(getThemeUrl(name)).toBeNull();
    },
  );

  it('emits no stylesheet for a version-pinned default theme', () => {
    expect(getThemeUrl('default@v0.1.10')).toBeNull();
  });

  it('passes self-hosted theme URLs through unchanged', () => {
    expect(getThemeUrl('https://example.com/my-theme.css')).toBe(
      'https://example.com/my-theme.css',
    );
  });

  it('keeps version-pinned URLs (pinned refs 404 fast on missing files)', () => {
    expect(getThemeUrl('leaf@v0.1.10')).toBe(
      'https://cdn.jsdelivr.net/gh/flowershow/themes@v0.1.10/leaf/theme.css',
    );
  });
});
