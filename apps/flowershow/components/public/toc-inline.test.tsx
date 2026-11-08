import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TocInlineView } from './toc-inline';

const ITEMS = [
  { id: 'intro', title: 'Intro', depth: 0 as const },
  { id: 'setup', title: 'Setup', depth: 1 as const },
  { id: 'usage', title: 'Usage', depth: 0 as const },
];

afterEach(cleanup);

describe('TocInlineView', () => {
  it('renders nothing for fewer than 3 items', () => {
    const { container } = render(
      <TocInlineView items={ITEMS.slice(0, 2)} tocStyle="rail" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a closed details with a Contents summary and ordered links', () => {
    const { container } = render(
      <TocInlineView items={ITEMS} tocStyle="rail" />,
    );
    const details = container.querySelector(
      'details.toc-inline',
    ) as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details.getAttribute('data-toc-style')).toBe('rail');
    expect(details.querySelector('summary')?.textContent).toBe('Contents');
    const lis = [...details.querySelectorAll('ol > li')];
    expect(lis.map((li) => li.getAttribute('data-depth'))).toEqual([
      '0',
      '1',
      '0',
    ]);
    const links = [...details.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '#intro',
      '#setup',
      '#usage',
    ]);
    expect(links.map((a) => a.textContent)).toEqual([
      'Intro',
      'Setup',
      'Usage',
    ]);
  });

  it('closes when a link is clicked, without preventing navigation', () => {
    const { container } = render(
      <TocInlineView items={ITEMS} tocStyle="panel" />,
    );
    const details = container.querySelector('details') as HTMLDetailsElement;
    details.open = true;
    const link = details.querySelector('a') as HTMLAnchorElement;
    const notPrevented = fireEvent.click(link);
    expect(notPrevented).toBe(true);
    expect(details.open).toBe(false);
  });
});
