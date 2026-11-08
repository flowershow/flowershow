import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { railCurrentId, TocRailView } from './toc-rail';

const ITEMS = [
  { id: 'intro', title: 'Intro', depth: 0 as const },
  { id: 'setup', title: 'Setup', depth: 1 as const },
  { id: 'usage', title: 'Usage', depth: 0 as const },
];

const renderRail = (currentId: string | null = null) => {
  const utils = render(
    <>
      <h2 id="intro">Intro</h2>
      <h3 id="setup">Setup</h3>
      <h2 id="usage">Usage</h2>
      <TocRailView items={ITEMS} currentId={currentId} />
    </>,
  );
  const nav = utils.container.querySelector('nav.toc-rail') as HTMLElement;
  const button = utils.container.querySelector(
    '.toc-rail-button',
  ) as HTMLButtonElement;
  const outline = utils.container.querySelector(
    '.toc-rail-outline',
  ) as HTMLElement;
  return { ...utils, nav, button, outline };
};

const expectOpen = (button: HTMLElement, outline: HTMLElement) => {
  expect(outline.hidden).toBe(false);
  expect(button.getAttribute('aria-expanded')).toBe('true');
};
const expectClosed = (button: HTMLElement, outline: HTMLElement) => {
  expect(outline.hidden).toBe(true);
  expect(button.getAttribute('aria-expanded')).toBe('false');
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TocRailView', () => {
  it('renders nothing for fewer than 3 items', () => {
    const { container } = render(
      <TocRailView items={ITEMS.slice(0, 2)} currentId={null} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders a Contents nav with ticks and links for 3 items', () => {
    const { nav, button, outline } = renderRail();
    expect(nav.getAttribute('aria-label')).toBe('Contents');
    expect(button.getAttribute('aria-controls')).toBe('toc-rail-outline');
    expect(outline.id).toBe('toc-rail-outline');
    expect(
      nav.querySelector('.toc-rail-ticks')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(nav.querySelectorAll('.toc-rail-tick')).toHaveLength(3);
    const links = Array.from(outline.querySelectorAll('ol > li > a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '#intro',
      '#setup',
      '#usage',
    ]);
    expect(
      Array.from(outline.querySelectorAll('li')).map((li) => li.dataset.depth),
    ).toEqual(['0', '1', '0']);
  });

  it('is closed at rest and opens on pointer enter', () => {
    const { nav, button, outline } = renderRail();
    expectClosed(button, outline);
    expect(nav.dataset.open).toBe('false');
    fireEvent.pointerEnter(nav, { pointerType: 'mouse' });
    expectOpen(button, outline);
    expect(nav.dataset.open).toBe('true');
  });

  it('closes 300ms after pointer leave, cancelled by re-entry', () => {
    vi.useFakeTimers();
    const { nav, button, outline } = renderRail();
    fireEvent.pointerEnter(nav, { pointerType: 'mouse' });
    fireEvent.pointerLeave(nav, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(200));
    expectOpen(button, outline);
    fireEvent.pointerEnter(nav, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(400));
    expectOpen(button, outline);
    fireEvent.pointerLeave(nav, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(300));
    expectClosed(button, outline);
  });

  it('stays open after pointer leave while focus is inside', () => {
    vi.useFakeTimers();
    const { nav, button, outline } = renderRail();
    act(() => (outline.querySelector('a') as HTMLAnchorElement).focus());
    fireEvent.pointerEnter(nav, { pointerType: 'mouse' });
    fireEvent.pointerLeave(nav, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(300));
    expectOpen(button, outline);
  });

  it('opens on focus; Escape closes and returns focus to the button', () => {
    const { button, outline } = renderRail();
    const link = outline.querySelector('a') as HTMLAnchorElement;
    act(() => link.focus());
    expectOpen(button, outline);
    fireEvent.keyDown(link, { key: 'Escape' });
    expectClosed(button, outline);
    expect(document.activeElement).toBe(button);
  });

  it('closes when focus leaves the nav', () => {
    const { button, outline } = renderRail();
    const outside = document.getElementById('intro') as HTMLElement;
    outside.tabIndex = -1;
    act(() => (outline.querySelector('a') as HTMLAnchorElement).focus());
    expectOpen(button, outline);
    act(() => outside.focus());
    expectClosed(button, outline);
  });

  it('link click scrolls to and focuses the heading, and closes', () => {
    const { nav, button, outline } = renderRail();
    fireEvent.pointerEnter(nav, { pointerType: 'mouse' });
    const link = outline.querySelector('a[href="#usage"]') as HTMLElement;
    fireEvent.click(link);
    const heading = document.getElementById('usage') as HTMLElement;
    expect(heading.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(heading);
    expect(heading.tabIndex).toBe(-1);
    expect(window.location.hash).toBe('#usage');
    expectClosed(button, outline);
  });

  it('marks the current item and earlier items as read', () => {
    const { nav, outline } = renderRail('setup');
    const ticks = Array.from(
      nav.querySelectorAll<HTMLElement>('.toc-rail-tick'),
    );
    const lis = Array.from(outline.querySelectorAll<HTMLElement>('li'));
    for (const list of [ticks, lis]) {
      expect(list.map((el) => 'current' in el.dataset)).toEqual([
        false,
        true,
        false,
      ]);
    }
    expect(ticks.map((el) => 'read' in el.dataset)).toEqual([
      true,
      false,
      false,
    ]);
    expect(ticks.map((el) => el.dataset.depth)).toEqual(['0', '1', '0']);
  });

  it('touch taps toggle; a tap outside closes', () => {
    const { button, outline } = renderRail();
    fireEvent.pointerDown(button, { pointerType: 'touch' });
    fireEvent.click(button);
    expectOpen(button, outline);
    fireEvent.pointerDown(button, { pointerType: 'touch' });
    fireEvent.click(button);
    expectClosed(button, outline);
    fireEvent.pointerDown(button, { pointerType: 'touch' });
    fireEvent.click(button);
    expectOpen(button, outline);
    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    expectClosed(button, outline);
  });

  it('mouse click after hover leaves it open', () => {
    const { nav, button, outline } = renderRail();
    fireEvent.pointerEnter(nav, { pointerType: 'mouse' });
    fireEvent.pointerDown(button, { pointerType: 'mouse' });
    fireEvent.click(button, { detail: 1 });
    expectOpen(button, outline);
  });

  it('a keyboard click (detail 0) toggles the outline', () => {
    const { button, outline } = renderRail();
    act(() => button.focus());
    expectOpen(button, outline);
    fireEvent.click(button, { detail: 0 });
    expectClosed(button, outline);
    fireEvent.click(button, { detail: 0 });
    expectOpen(button, outline);
  });

  it('an abandoned touch press (pointercancel) does not block keyboard focus opening', () => {
    const { button, outline } = renderRail();
    fireEvent.pointerDown(button, { pointerType: 'touch' });
    fireEvent.pointerCancel(button, { pointerType: 'touch' });
    const link = outline.querySelector('a') as HTMLElement;
    act(() => link.focus());
    expectOpen(button, outline);
  });
});

describe('railCurrentId', () => {
  const sections = [
    {
      id: 'a',
      title: 'A',
      level: 'H2',
      children: [
        {
          id: 'a1',
          title: 'A1',
          level: 'H3',
          children: [{ id: 'a1x', title: 'A1x', level: 'H4', children: [] }],
        },
      ],
    },
    { id: 'b', title: 'B', level: 'H2', children: [] },
  ];

  it('keeps shown ids and maps deeper ids to their nearest shown ancestor', () => {
    expect(railCurrentId(sections, 'b')).toBe('b');
    expect(railCurrentId(sections, 'a1')).toBe('a1');
    expect(railCurrentId(sections, 'a1x')).toBe('a1');
    expect(railCurrentId(sections, undefined)).toBeNull();
    expect(railCurrentId(sections, 'missing')).toBeNull();
  });
});
