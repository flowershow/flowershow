import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CustomHead } from './custom-head';

afterEach(() => {
  cleanup();
  // React 19 hoists <meta>/<link> into document.head; clear them between tests.
  document.head
    .querySelectorAll('[data-test-head]')
    .forEach((el) => el.remove());
});

describe('CustomHead', () => {
  it('renders a verification <meta> tag from raw head HTML', () => {
    render(
      <CustomHead html='<meta data-test-head name="google-site-verification" content="abc123" />' />,
    );

    // React 19 hoists metadata tags into the document head.
    const meta = document.head.querySelector(
      'meta[name="google-site-verification"]',
    );
    expect(meta).not.toBeNull();
    expect(meta?.getAttribute('content')).toBe('abc123');
  });

  it('renders a <script> tag but does not execute it at render time', () => {
    // If the injected script ran during render, this sentinel would flip.
    (globalThis as Record<string, unknown>).__customHeadRan = false;
    const { container } = render(
      <CustomHead html='<script>globalThis.__customHeadRan = true;</script><script src="https://example.com/widget.js"></script>' />,
    );

    expect(
      container.querySelector('script[src="https://example.com/widget.js"]'),
    ).not.toBeNull();
    // Serialized as inert markup; never evaluated during (server) render.
    expect((globalThis as Record<string, unknown>).__customHeadRan).toBe(false);
  });

  it('renders nothing for empty or whitespace-only input', () => {
    expect(CustomHead({ html: '' })).toBeNull();
    expect(CustomHead({ html: '   \n ' })).toBeNull();
  });

  it('renders multiple sibling tags from one string', () => {
    render(
      <CustomHead html='<link data-test-head rel="preconnect" href="https://a.example" /><meta data-test-head name="x" content="y" />' />,
    );

    expect(
      document.head.querySelector('link[href="https://a.example"]'),
    ).not.toBeNull();
    expect(document.head.querySelector('meta[name="x"]')).not.toBeNull();
  });
});
