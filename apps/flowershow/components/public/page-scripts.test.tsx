import { act, cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE_LEAVE_EVENT, PageScripts } from './page-scripts';

const SELECTOR = 'script[data-flowershow-page-script]';
const inserted = () =>
  Array.from(document.body.querySelectorAll<HTMLScriptElement>(SELECTOR));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  inserted().forEach((el) => el.remove());
});

describe('PageScripts', () => {
  it('inserts one classic, ordered <script> per src after mount', () => {
    render(<PageScripts srcs={['/a.js', 'https://cdn.example.com/b.js']} />);
    // Insertion is deferred to the next task.
    expect(inserted()).toHaveLength(0);
    act(() => {
      vi.runAllTimers();
    });

    const scripts = inserted();
    expect(scripts).toHaveLength(2);
    expect(scripts[0]!.getAttribute('src')).toBe('/a.js');
    expect(scripts[1]!.getAttribute('src')).toBe(
      'https://cdn.example.com/b.js',
    );
    for (const s of scripts) {
      expect(s.async).toBe(false);
      expect(s.type).toBe('');
      expect(s.parentElement).toBe(document.body);
    }
  });

  it('removes its scripts on unmount', () => {
    const { unmount } = render(<PageScripts srcs={['/a.js', '/b.js']} />);
    act(() => {
      vi.runAllTimers();
    });
    expect(inserted()).toHaveLength(2);
    unmount();
    expect(inserted()).toHaveLength(0);
  });

  it('dispatches a page-leave event on document when leaving the page', () => {
    const listener = vi.fn();
    document.addEventListener(PAGE_LEAVE_EVENT, listener);
    const { unmount } = render(<PageScripts srcs={['/a.js']} />);
    act(() => {
      vi.runAllTimers();
    });
    expect(listener).not.toHaveBeenCalled();
    unmount();
    expect(listener).toHaveBeenCalledTimes(1);
    document.removeEventListener(PAGE_LEAVE_EVENT, listener);
  });

  it('does not insert anything if unmounted before the deferred insert', () => {
    const { unmount } = render(<PageScripts srcs={['/a.js']} />);
    unmount();
    act(() => {
      vi.runAllTimers();
    });
    expect(inserted()).toHaveLength(0);
  });

  it('inserts fresh elements again on remount (navigating back)', () => {
    const first = render(<PageScripts srcs={['/a.js']} />);
    act(() => {
      vi.runAllTimers();
    });
    const firstEl = inserted()[0];
    first.unmount();

    render(<PageScripts srcs={['/a.js']} />);
    act(() => {
      vi.runAllTimers();
    });
    const scripts = inserted();
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).not.toBe(firstEl);
  });

  it('inserts once under StrictMode double-mount', async () => {
    const { StrictMode } = await import('react');
    render(
      <StrictMode>
        <PageScripts srcs={['/a.js']} />
      </StrictMode>,
    );
    act(() => {
      vi.runAllTimers();
    });
    expect(inserted()).toHaveLength(1);
  });

  it('renders and inserts nothing for an empty list', () => {
    const { container } = render(<PageScripts srcs={[]} />);
    act(() => {
      vi.runAllTimers();
    });
    expect(container.innerHTML).toBe('');
    expect(inserted()).toHaveLength(0);
  });

  it('emits no <script> during server rendering', () => {
    expect(renderToString(<PageScripts srcs={['/a.js']} />)).not.toContain(
      '<script',
    );
  });
});
