import { act, cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE_LEAVE_EVENT, PageScripts } from './page-scripts';

const SELECTOR = 'script[data-flowershow-page-script]';
const inserted = () =>
  Array.from(document.body.querySelectorAll<HTMLScriptElement>(SELECTOR));
const srcsOf = () => inserted().map((el) => el.getAttribute('src'));
const fire = (el: HTMLScriptElement, type: 'load' | 'error') =>
  act(() => {
    el.dispatchEvent(new Event(type));
  });
const flush = () =>
  act(() => {
    vi.runAllTimers();
  });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  inserted().forEach((el) => el.remove());
});

describe('PageScripts', () => {
  it('inserts classic <script> elements one at a time, in order', () => {
    render(<PageScripts srcs={['/a.js', 'https://cdn.example.com/b.js']} />);
    // Insertion is deferred to the next task.
    expect(inserted()).toHaveLength(0);
    flush();

    // Only the first script until it has loaded.
    expect(srcsOf()).toEqual(['/a.js']);
    const [first] = inserted();
    expect(first!.async).toBe(true);
    expect(first!.type).toBe('');
    expect(first!.parentElement).toBe(document.body);

    fire(first!, 'load');
    expect(srcsOf()).toEqual(['/a.js', 'https://cdn.example.com/b.js']);
  });

  it('continues with the next script when one fails to load', () => {
    render(<PageScripts srcs={['/a.js', '/b.js', '/c.js']} />);
    flush();
    fire(inserted()[0]!, 'error');
    expect(srcsOf()).toEqual(['/a.js', '/b.js']);
    fire(inserted()[1]!, 'load');
    expect(srcsOf()).toEqual(['/a.js', '/b.js', '/c.js']);
  });

  it('removes its scripts on unmount', () => {
    const { unmount } = render(<PageScripts srcs={['/a.js', '/b.js']} />);
    flush();
    fire(inserted()[0]!, 'load');
    expect(inserted()).toHaveLength(2);
    unmount();
    expect(inserted()).toHaveLength(0);
  });

  it('stops the chain when the page is left while a script is pending', () => {
    const { unmount } = render(<PageScripts srcs={['/a.js', '/b.js']} />);
    flush();
    const pending = inserted()[0]!;
    unmount();
    // The removed script finishes loading after the reader left.
    fire(pending, 'load');
    expect(inserted()).toHaveLength(0);
  });

  it('does not duplicate scripts on a fast A→B→A while one is pending', () => {
    const first = render(<PageScripts srcs={['/a.js', '/b.js']} />);
    flush();
    const stale = inserted()[0]!;
    first.unmount();

    render(<PageScripts srcs={['/a.js', '/b.js']} />);
    flush();
    expect(srcsOf()).toEqual(['/a.js']);
    // The first visit's in-flight script settles: it must not advance either
    // the old chain or the new one.
    fire(stale, 'load');
    expect(srcsOf()).toEqual(['/a.js']);
    fire(inserted()[0]!, 'load');
    expect(srcsOf()).toEqual(['/a.js', '/b.js']);
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
