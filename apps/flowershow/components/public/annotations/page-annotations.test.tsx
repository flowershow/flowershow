import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import PageAnnotations, { HIGHLIGHT_CSS } from './page-annotations';

const annotation = (over: Record<string, unknown> = {}) => ({
  id: 'a1',
  siteId: 'site-1',
  path: 'notes/draft.md',
  pageUrl: 'https://notes-ada.flowershow.me/notes/draft',
  selector: {
    exact: 'brown fox',
    prefix: 'The quick ',
    suffix: ' jumps over the lazy dog.',
    start: 10,
    end: 19,
  },
  note: 'Make it red',
  authorName: 'Ada',
  status: 'open',
  pageEdited: false,
  createdAt: '2026-10-03T10:00:00.000Z',
  ...over,
});

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status < 400,
    status,
    json: async () => body,
  } as Response);

function mountContent(
  html = '<p>The quick brown fox jumps over the lazy dog.</p>',
) {
  const div = document.createElement('div');
  div.id = 'mdxpage';
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

function select(root: HTMLElement, start = 10, end = 19) {
  const text = root.querySelector('p')!.firstChild!;
  const range = document.createRange();
  range.setStart(text, start);
  range.setEnd(text, end);
  document.getSelection()!.removeAllRanges();
  document.getSelection()!.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}

const renderOverlay = () =>
  render(
    <PageAnnotations
      siteId="site-1"
      pagePath="notes/draft.md"
      manageUrl="https://cloud.test/site/site-1/annotations"
    />,
  );

beforeAll(() => {
  // jsdom 27 has no layout: Range#getBoundingClientRect is missing.
  if (!Range.prototype.getBoundingClientRect)
    Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  try {
    window.localStorage.clear();
  } catch {}
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('PageAnnotations', () => {
  it('injects the ::highlight rule at runtime when the overlay mounts', async () => {
    mountContent();
    vi.mocked(fetch).mockReturnValueOnce(jsonResponse({ annotations: [] }));
    renderOverlay();
    await screen.findByRole('button', { name: /Annotations on/ });
    const style = document.querySelector(
      'style[data-fs-annotations-highlight]',
    );
    expect(style?.textContent).toBe(HIGHLIGHT_CSS);
    expect(HIGHLIGHT_CSS).toContain('::highlight(fs-annotation)');
    expect(HIGHLIGHT_CSS).toContain('var(--color-accent,#fb923c) 30%');
  });

  it('shows a pill with the open count', async () => {
    mountContent();
    vi.mocked(fetch).mockReturnValueOnce(
      jsonResponse({
        annotations: [
          annotation(),
          annotation({ id: 'a2', status: 'resolved' }),
        ],
      }),
    );
    renderOverlay();
    expect(
      await screen.findByRole('button', {
        name: 'Annotations on · 1 note · select text to add one',
      }),
    ).toBeInTheDocument();
  });

  it('keeps outdated notes in the list, labelled, and collapses resolved ones', async () => {
    mountContent();
    vi.mocked(fetch).mockReturnValueOnce(
      jsonResponse({
        annotations: [
          annotation(),
          annotation({
            id: 'a2',
            note: 'Gone',
            selector: {
              exact: 'purple cow',
              prefix: '',
              suffix: '',
              start: 0,
              end: 10,
            },
          }),
          annotation({ id: 'a3', note: 'Done already', status: 'resolved' }),
        ],
      }),
    );
    renderOverlay();
    fireEvent.click(
      await screen.findByRole('button', { name: /^Annotations on · 2 notes/ }),
    );
    const panel = screen.getByRole('complementary', { name: 'Annotations' });
    const items = within(panel).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Make it red');
    expect(items[1]).toHaveTextContent('Gone');
    expect(within(items[1]!).getByText('Outdated')).toBeInTheDocument();
    expect(
      within(panel)
        .getByText(/✓ Resolved/)
        .closest('details'),
    ).not.toHaveAttribute('open');
  });

  it('turns a selection into a saved annotation, focusing the note and asking for a name only once', async () => {
    const root = mountContent();
    vi.mocked(fetch)
      .mockReturnValueOnce(jsonResponse({ annotations: [] }))
      .mockReturnValueOnce(
        jsonResponse(
          { annotation: annotation({ id: 'a3', note: 'New note' }) },
          201,
        ),
      );
    renderOverlay();
    await screen.findByRole('button', { name: /^Annotations on · 0 notes/ });

    select(root);
    fireEvent.click(await screen.findByRole('button', { name: 'Annotate' }));
    expect(screen.getByLabelText('Note')).toHaveFocus();
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'New note' },
    });
    fireEvent.change(screen.getByLabelText('Your name (optional)'), {
      target: { value: 'Ada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save annotation' }));
    // Scoped to <p>: React mirrors the textarea's value into its text, so an unscoped query matches the form.
    expect(
      await screen.findByText('New note', { selector: 'p' }),
    ).toBeInTheDocument();
    const [, init] = vi.mocked(fetch).mock.calls[1]!;
    expect(JSON.parse(init!.body as string)).toEqual({
      path: 'notes/draft.md',
      selector: {
        exact: 'brown fox',
        prefix: 'The quick ',
        suffix: ' jumps over the lazy dog.',
        start: 10,
        end: 19,
      },
      note: 'New note',
      authorName: 'Ada',
    });

    select(root);
    fireEvent.click(await screen.findByRole('button', { name: 'Annotate' }));
    expect(screen.queryByLabelText('Your name (optional)')).toBeNull();
    expect(screen.getByText(/Posting as Ada/)).toBeInTheDocument();
  });

  it('warns up front when a long selection will be clamped', async () => {
    const root = mountContent(`<p>${'x'.repeat(1100)}</p>`);
    vi.mocked(fetch).mockReturnValueOnce(jsonResponse({ annotations: [] }));
    renderOverlay();
    await screen.findByRole('button', { name: /^Annotations on/ });
    select(root, 0, 1100);
    fireEvent.click(await screen.findByRole('button', { name: 'Annotate' }));
    expect(
      screen.getByText(
        'Only the first 1,000 characters of your selection will be quoted.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the Annotate button for a moment after the selection collapses (touch taps)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const root = mountContent();
    vi.mocked(fetch).mockReturnValueOnce(jsonResponse({ annotations: [] }));
    renderOverlay();
    await screen.findByRole('button', { name: /^Annotations on/ });
    select(root);
    const button = await screen.findByRole('button', { name: 'Annotate' });
    document.getSelection()!.removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));
    fireEvent.click(button);
    expect(screen.getByLabelText('Note')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('opens the panel at a note when its highlighted text is clicked', async () => {
    const root = mountContent();
    vi.mocked(fetch).mockReturnValueOnce(
      jsonResponse({ annotations: [annotation()] }),
    );
    renderOverlay();
    await screen.findByRole('button', { name: /^Annotations on · 1 note/ });
    const text = root.querySelector('p')!.firstChild!;
    (
      document as unknown as { caretPositionFromPoint: unknown }
    ).caretPositionFromPoint = () => ({ offsetNode: text, offset: 12 });
    fireEvent.click(root.querySelector('p')!, { clientX: 5, clientY: 5 });
    const panel = await screen.findByRole('complementary', {
      name: 'Annotations',
    });
    expect(within(panel).getByText('Make it red').closest('li')).toHaveClass(
      'is-focused',
    );
    delete (document as unknown as { caretPositionFromPoint?: unknown })
      .caretPositionFromPoint;
  });

  it('closes the panel on Escape', async () => {
    mountContent();
    vi.mocked(fetch).mockReturnValueOnce(jsonResponse({ annotations: [] }));
    renderOverlay();
    fireEvent.click(
      await screen.findByRole('button', { name: /^Annotations on/ }),
    );
    expect(
      screen.getByRole('complementary', { name: 'Annotations' }),
    ).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('complementary', { name: 'Annotations' }),
    ).toBeNull();
  });

  it('renders hostile note and name text as plain text', async () => {
    mountContent();
    vi.mocked(fetch).mockReturnValueOnce(
      jsonResponse({
        annotations: [
          annotation({
            note: '<img src=x onerror=alert(1)>',
            authorName: '<b>Eve</b>',
          }),
        ],
      }),
    );
    renderOverlay();
    fireEvent.click(
      await screen.findByRole('button', { name: /^Annotations on/ }),
    );
    expect(
      screen.getByText('<img src=x onerror=alert(1)>'),
    ).toBeInTheDocument();
    expect(screen.getByText(/<b>Eve<\/b>/)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('shows the server error when saving fails', async () => {
    const root = mountContent();
    vi.mocked(fetch)
      .mockReturnValueOnce(jsonResponse({ annotations: [] }))
      .mockReturnValueOnce(
        jsonResponse(
          { message: 'This page has reached its annotation limit.' },
          409,
        ),
      );
    renderOverlay();
    await screen.findByRole('button', { name: /^Annotations on/ });
    select(root);
    fireEvent.click(await screen.findByRole('button', { name: 'Annotate' }));
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save annotation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This page has reached its annotation limit.',
    );
  });

  it('on touch devices, uses the floating Annotate button, a short pill, and closes the panel after saving', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(pointer: coarse)',
        media: query,
        addEventListener() {},
        removeEventListener() {},
      })),
    );
    const root = mountContent();
    vi.mocked(fetch)
      .mockReturnValueOnce(jsonResponse({ annotations: [] }))
      .mockReturnValueOnce(
        jsonResponse(
          { annotation: annotation({ id: 'a3', note: 'New note' }) },
          201,
        ),
      );
    renderOverlay();
    const pill = await screen.findByRole('button', {
      name: 'Annotations on · 0 notes · select text to add one',
    });
    expect(pill).toHaveTextContent(/^0 notes$/);

    select(root);
    const add = await screen.findByRole('button', { name: 'Annotate' });
    expect(add).toHaveClass('is-touch');
    fireEvent.click(add);
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'New note' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save annotation' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('complementary', { name: 'Annotations' }),
      ).toBeNull(),
    );
    expect(
      await screen.findByRole('button', {
        name: 'Annotations on · 1 note · select text to add one',
      }),
    ).toHaveTextContent(/^1 note$/);
  });

  it('offers Annotate again after a draft is closed, keeping the typed note and taking the new quote', async () => {
    const root = mountContent();
    vi.mocked(fetch)
      .mockReturnValueOnce(jsonResponse({ annotations: [] }))
      .mockReturnValueOnce(
        jsonResponse(
          { annotation: annotation({ id: 'a3', note: 'Half typed' }) },
          201,
        ),
      );
    renderOverlay();
    await screen.findByRole('button', { name: /^Annotations on/ });
    select(root);
    fireEvent.click(await screen.findByRole('button', { name: 'Annotate' }));
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Half typed' },
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('complementary', { name: 'Annotations' }),
    ).toBeNull();

    select(root, 4, 9);
    fireEvent.click(await screen.findByRole('button', { name: 'Annotate' }));
    expect(screen.getByLabelText('Note')).toHaveValue('Half typed');
    fireEvent.click(screen.getByRole('button', { name: 'Save annotation' }));
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    const [, init] = vi.mocked(fetch).mock.calls[1]!;
    expect(JSON.parse(init!.body as string).selector.exact).toBe('quick');
  });

  it('renders nothing when the page has no Markdown root to annotate', async () => {
    vi.mocked(fetch).mockReturnValueOnce(
      jsonResponse({ annotations: [annotation()] }),
    );
    renderOverlay();
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      screen.queryByRole('button', { name: /^Annotations on/ }),
    ).toBeNull();
  });
});
