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
import { formatRelative } from './comment-item';
import PageAnnotations, {
  HIGHLIGHT_CSS,
  OPEN_CLASS,
  OWNER_ME_PATH,
  OWNER_SIGNIN_PATH,
  placeAddButton,
  SHEET_QUERY,
} from './page-annotations';

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

/** The annotations API. `/_flowershow/owner/me` is answered by `ownerMe` instead. */
const apiFetch =
  vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const ownerMe = vi.fn(() => jsonResponse({ isOwner: false }));

beforeEach(() => {
  ownerMe.mockImplementation(() => jsonResponse({ isOwner: false }));
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) =>
      String(url) === OWNER_ME_PATH ? ownerMe() : apiFetch(url, init),
    ),
  );
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
    apiFetch.mockReturnValueOnce(jsonResponse({ annotations: [] }));
    renderOverlay();
    await waitFor(() =>
      expect(
        document.querySelector('style[data-fs-annotations-highlight]'),
      ).not.toBeNull(),
    );
    const style = document.querySelector(
      'style[data-fs-annotations-highlight]',
    );
    expect(style?.textContent).toBe(HIGHLIGHT_CSS);
    expect(HIGHLIGHT_CSS).toContain('::highlight(fs-annotation)');
    expect(HIGHLIGHT_CSS).toContain('var(--color-accent,#fb923c) 30%');
  });

  it('shows a bar with the open count and a Show comments toggle', async () => {
    mountContent();
    apiFetch.mockReturnValueOnce(
      jsonResponse({
        annotations: [
          annotation(),
          annotation({ id: 'a2', status: 'resolved' }),
        ],
      }),
    );
    renderOverlay();
    const toggle = await screen.findByRole('button', {
      name: 'Show comments',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // aria-controls only while the panel exists (1pr.6).
    expect(toggle).not.toHaveAttribute('aria-controls');
    expect(screen.getByText('1 comment')).toBeInTheDocument();
    expect(screen.getByText('Select text to comment')).toBeInTheDocument();
  });

  it('with no comments yet, invites them and has no toggle', async () => {
    mountContent();
    apiFetch.mockReturnValueOnce(jsonResponse({ annotations: [] }));
    renderOverlay();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(screen.getByText('Open for comments')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /comments$/ })).toBeNull();
  });

  it('opens a docked panel from the bar and returns focus to the toggle on close', async () => {
    mountContent();
    apiFetch.mockReturnValueOnce(jsonResponse({ annotations: [annotation()] }));
    renderOverlay();
    const toggle = await screen.findByRole('button', {
      name: 'Show comments',
    });
    toggle.focus();
    fireEvent.click(toggle);
    const panel = screen.getByRole('complementary', { name: 'Comments' });
    expect(toggle).toHaveTextContent('Hide comments');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', panel.id);
    expect(document.documentElement).toHaveClass(OPEN_CLASS);
    expect(panel).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('complementary', { name: 'Comments' }),
    ).toBeNull();
    expect(document.documentElement).not.toHaveClass(OPEN_CLASS);
    expect(toggle).toHaveFocus();
    expect(toggle).not.toHaveAttribute('aria-controls');
  });

  it('groups comments whose quote is gone, and resolved ones, collapsed below the list', async () => {
    mountContent();
    apiFetch.mockReturnValueOnce(
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
    expect(await screen.findByText('2 comments')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show comments' }));
    const panel = screen.getByRole('complementary', { name: 'Comments' });
    const items = within(panel).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Make it red');
    const outdated = within(panel)
      .getByText('Not found on page (1)')
      .closest('details')!;
    expect(outdated).not.toHaveAttribute('open');
    expect(outdated).toHaveTextContent('Gone');
    const resolved = within(panel)
      .getByText('Resolved (1)')
      .closest('details')!;
    expect(resolved).not.toHaveAttribute('open');
    expect(resolved).toHaveTextContent('Done already');
  });

  describe('site owner (1pr.15)', () => {
    it('offers a quiet owner sign-in link to everyone else, with no owner controls', async () => {
      mountContent();
      apiFetch.mockReturnValueOnce(
        jsonResponse({ annotations: [annotation()] }),
      );
      renderOverlay();
      fireEvent.click(
        await screen.findByRole('button', { name: 'Show comments' }),
      );
      const panel = screen.getByRole('complementary', { name: 'Comments' });
      const signIn = within(panel).getByRole('link', {
        name: 'Site owner? Sign in to manage comments',
      });
      expect(signIn.getAttribute('href')).toBe(
        `${OWNER_SIGNIN_PATH}?return=${encodeURIComponent(window.location.pathname)}`,
      );
      expect(
        within(panel).queryByRole('button', { name: 'Resolve' }),
      ).toBeNull();
      expect(screen.queryByText('Owner')).toBeNull();
    });

    it('shows the Owner badge and resolves a comment through the owner API', async () => {
      mountContent();
      ownerMe.mockImplementation(() => jsonResponse({ isOwner: true }));
      apiFetch
        .mockReturnValueOnce(jsonResponse({ annotations: [annotation()] }))
        .mockReturnValueOnce(jsonResponse({ count: 1 }));
      renderOverlay();
      expect(await screen.findByText('Owner')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Show comments' }));
      const panel = screen.getByRole('complementary', { name: 'Comments' });
      fireEvent.click(within(panel).getByRole('button', { name: 'Resolve' }));
      await waitFor(() =>
        expect(within(panel).getByText('Resolved (1)')).toBeInTheDocument(),
      );
      const [url, init] = apiFetch.mock.calls[1]!;
      expect(url).toBe('/api/sites/id/site-1/annotations/bulk');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({
        action: 'resolve',
        ids: ['a1'],
      });
      expect(
        within(panel).getByRole('button', { name: 'Sign out as owner' }),
      ).toBeInTheDocument();
    });

    it('deletes a comment after confirming', async () => {
      mountContent();
      ownerMe.mockImplementation(() => jsonResponse({ isOwner: true }));
      vi.stubGlobal(
        'confirm',
        vi.fn(() => true),
      );
      apiFetch
        .mockReturnValueOnce(jsonResponse({ annotations: [annotation()] }))
        .mockReturnValueOnce(jsonResponse({ count: 1 }));
      renderOverlay();
      await screen.findByText('Owner');
      fireEvent.click(screen.getByRole('button', { name: 'Show comments' }));
      const panel = screen.getByRole('complementary', { name: 'Comments' });
      fireEvent.click(within(panel).getByRole('button', { name: 'Delete' }));
      await waitFor(() =>
        expect(within(panel).queryByText('Make it red')).toBeNull(),
      );
      expect(JSON.parse(String(apiFetch.mock.calls[1]![1]?.body))).toEqual({
        action: 'delete',
        ids: ['a1'],
      });
    });

    it('drops owner mode when the API says the sign-in has expired', async () => {
      mountContent();
      ownerMe.mockImplementation(() => jsonResponse({ isOwner: true }));
      apiFetch
        .mockReturnValueOnce(jsonResponse({ annotations: [annotation()] }))
        .mockReturnValueOnce(jsonResponse({ error: 'unauthorized' }, 401));
      renderOverlay();
      await screen.findByText('Owner');
      fireEvent.click(screen.getByRole('button', { name: 'Show comments' }));
      const panel = screen.getByRole('complementary', { name: 'Comments' });
      fireEvent.click(within(panel).getByRole('button', { name: 'Resolve' }));
      expect(await within(panel).findByRole('alert')).toHaveTextContent(
        'Sign in again',
      );
      expect(screen.queryByText('Owner')).toBeNull();
    });
  });

  it('turns a selection into a saved annotation, focusing the comment box and asking for a name only once', async () => {
    const root = mountContent();
    apiFetch
      .mockReturnValueOnce(jsonResponse({ annotations: [] }))
      .mockReturnValueOnce(
        jsonResponse(
          { annotation: annotation({ id: 'a3', note: 'New note' }) },
          201,
        ),
      );
    renderOverlay();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());

    select(root);
    fireEvent.click(await screen.findByRole('button', { name: 'Comment' }));
    expect(screen.getByLabelText('Comment')).toHaveFocus();
    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: 'New note' },
    });
    fireEvent.change(screen.getByLabelText('Your name (optional)'), {
      target: { value: 'Ada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    // Scoped to <p>: React mirrors the textarea's value into its text, so an unscoped query matches the form.
    expect(
      await screen.findByText('New note', { selector: 'p' }),
    ).toBeInTheDocument();
    const [, init] = apiFetch.mock.calls[1]!;
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
    fireEvent.click(await screen.findByRole('button', { name: 'Comment' }));
    expect(screen.queryByLabelText('Your name (optional)')).toBeNull();
    expect(screen.getByText(/Posting as Ada/)).toBeInTheDocument();
  });

  it('warns up front when a long selection will be clamped', async () => {
    const root = mountContent(`<p>${'x'.repeat(1100)}</p>`);
    apiFetch.mockReturnValueOnce(jsonResponse({ annotations: [] }));
    renderOverlay();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    select(root, 0, 1100);
    fireEvent.click(await screen.findByRole('button', { name: 'Comment' }));
    expect(
      screen.getByText(
        'Only the first 1,000 characters of your selection will be quoted.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the Comment button for a moment after the selection collapses (touch taps)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const root = mountContent();
    apiFetch.mockReturnValueOnce(jsonResponse({ annotations: [] }));
    renderOverlay();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    select(root);
    const button = await screen.findByRole('button', { name: 'Comment' });
    document.getSelection()!.removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));
    fireEvent.click(button);
    expect(screen.getByLabelText('Comment')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('opens the panel at a note when its highlighted text is clicked', async () => {
    const root = mountContent();
    apiFetch.mockReturnValueOnce(jsonResponse({ annotations: [annotation()] }));
    renderOverlay();
    await screen.findByText('1 comment');
    const text = root.querySelector('p')!.firstChild!;
    (
      document as unknown as { caretPositionFromPoint: unknown }
    ).caretPositionFromPoint = () => ({ offsetNode: text, offset: 12 });
    fireEvent.click(root.querySelector('p')!, { clientX: 5, clientY: 5 });
    const panel = await screen.findByRole('complementary', {
      name: 'Comments',
    });
    expect(within(panel).getByText('Make it red').closest('li')).toHaveClass(
      'is-focused',
    );
    delete (document as unknown as { caretPositionFromPoint?: unknown })
      .caretPositionFromPoint;
  });

  describe('on a phone (bottom sheet)', () => {
    let scrollTo: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
          matches: query === SHEET_QUERY || query === '(pointer: coarse)',
          media: query,
          addEventListener() {},
          removeEventListener() {},
        })),
      );
      scrollTo = vi.fn();
      vi.stubGlobal('scrollTo', scrollTo);
    });

    it('tapping a highlight opens a sheet at its comment, lifts the passage above it and takes focus', async () => {
      const root = mountContent();
      apiFetch.mockReturnValueOnce(
        jsonResponse({ annotations: [annotation()] }),
      );
      renderOverlay();
      await screen.findByText('1 comment');
      const text = root.querySelector('p')!.firstChild!;
      (
        document as unknown as { caretPositionFromPoint: unknown }
      ).caretPositionFromPoint = () => ({ offsetNode: text, offset: 12 });
      fireEvent.click(root.querySelector('p')!, { clientX: 5, clientY: 5 });
      const sheet = await screen.findByRole('dialog', { name: 'Comments' });
      expect(sheet).toHaveClass('is-sheet');
      expect(sheet).toHaveAttribute('aria-modal', 'false');
      expect(within(sheet).getByText('Make it red').closest('li')).toHaveClass(
        'is-focused',
      );
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'smooth' }),
      );
      expect(sheet).toHaveFocus();
      delete (document as unknown as { caretPositionFromPoint?: unknown })
        .caretPositionFromPoint;

      fireEvent.click(
        within(sheet).getByRole('button', { name: 'Close comments' }),
      );
      expect(screen.queryByRole('dialog', { name: 'Comments' })).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Show comments' }),
      ).toHaveFocus();
    });

    it('closes when the header is swiped down', async () => {
      mountContent();
      apiFetch.mockReturnValueOnce(
        jsonResponse({ annotations: [annotation()] }),
      );
      renderOverlay();
      fireEvent.click(
        await screen.findByRole('button', { name: 'Show comments' }),
      );
      const header = screen
        .getByRole('dialog', { name: 'Comments' })
        .querySelector('.fs-annotations-header')!;
      fireEvent.touchStart(header, { touches: [{ clientY: 100 }] });
      fireEvent.touchEnd(header, { changedTouches: [{ clientY: 120 }] });
      expect(
        screen.getByRole('dialog', { name: 'Comments' }),
      ).toBeInTheDocument();
      fireEvent.touchStart(header, { touches: [{ clientY: 100 }] });
      fireEvent.touchEnd(header, { changedTouches: [{ clientY: 200 }] });
      expect(screen.queryByRole('dialog', { name: 'Comments' })).toBeNull();
    });

    it('keeps the composer above the on-screen keyboard and focuses it', async () => {
      const root = mountContent();
      const listeners: Record<string, () => void> = {};
      const viewport = {
        height: 800,
        offsetTop: 0,
        addEventListener: (type: string, fn: () => void) => {
          listeners[type] = fn;
        },
        removeEventListener() {},
      };
      vi.stubGlobal('visualViewport', viewport);
      vi.stubGlobal('innerHeight', 800);
      apiFetch.mockReturnValueOnce(jsonResponse({ annotations: [] }));
      renderOverlay();
      await waitFor(() => expect(apiFetch).toHaveBeenCalled());
      select(root);
      fireEvent.click(await screen.findByRole('button', { name: 'Comment' }));
      expect(scrollTo).toHaveBeenCalled();
      const sheet = screen.getByRole('dialog', { name: 'Comments' });
      expect(screen.getByLabelText('Comment')).toHaveFocus();
      expect(sheet.style.getPropertyValue('--fs-keyboard-inset')).toBe('0px');
      viewport.height = 450; // keyboard up
      listeners.resize!();
      expect(sheet.style.getPropertyValue('--fs-keyboard-inset')).toBe('350px');
      expect(sheet.style.getPropertyValue('--fs-visible-height')).toBe('450px');
    });
  });

  it('moves the Built with Flowershow badge left of the docked panel while it is open', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(min-width: 1280px)',
        media: query,
        addEventListener() {},
        removeEventListener() {},
      })),
    );
    mountContent();
    const badge = document.createElement('a');
    badge.id = 'built-with-button';
    badge.style.setProperty('right', '32px', 'important');
    document.body.appendChild(badge);
    apiFetch.mockReturnValueOnce(jsonResponse({ annotations: [annotation()] }));
    renderOverlay();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Show comments' }),
    );
    expect(badge.style.getPropertyValue('right')).toContain(
      '--fs-comments-panel-width',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hide comments' }));
    expect(badge.style.getPropertyValue('right')).toBe('32px');
    expect(badge.style.getPropertyPriority('right')).toBe('important');
  });

  it('renders hostile note and name text as plain text', async () => {
    mountContent();
    apiFetch.mockReturnValueOnce(
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
      await screen.findByRole('button', { name: 'Show comments' }),
    );
    expect(
      screen.getByText('<img src=x onerror=alert(1)>'),
    ).toBeInTheDocument();
    expect(screen.getByText(/<b>Eve<\/b>/)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('shows the server error when saving fails', async () => {
    const root = mountContent();
    apiFetch
      .mockReturnValueOnce(jsonResponse({ annotations: [] }))
      .mockReturnValueOnce(
        jsonResponse(
          { message: 'This page has reached its annotation limit.' },
          409,
        ),
      );
    renderOverlay();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    select(root);
    fireEvent.click(await screen.findByRole('button', { name: 'Comment' }));
    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This page has reached its annotation limit.',
    );
  });

  it('on touch devices, uses the floating Comment button and closes the panel after saving', async () => {
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
    apiFetch
      .mockReturnValueOnce(jsonResponse({ annotations: [] }))
      .mockReturnValueOnce(
        jsonResponse(
          { annotation: annotation({ id: 'a3', note: 'New note' }) },
          201,
        ),
      );
    renderOverlay();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());

    select(root);
    const add = await screen.findByRole('button', { name: 'Comment' });
    expect(add).toHaveClass('is-touch');
    fireEvent.click(add);
    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: 'New note' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('complementary', { name: 'Comments' }),
      ).toBeNull(),
    );
    expect(await screen.findByText('1 comment')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show comments' }),
    ).toBeInTheDocument();
  });

  it('offers Comment again after a draft is closed, keeping the typed note and taking the new quote', async () => {
    const root = mountContent();
    apiFetch
      .mockReturnValueOnce(jsonResponse({ annotations: [] }))
      .mockReturnValueOnce(
        jsonResponse(
          { annotation: annotation({ id: 'a3', note: 'Half typed' }) },
          201,
        ),
      );
    renderOverlay();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    select(root);
    fireEvent.click(await screen.findByRole('button', { name: 'Comment' }));
    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: 'Half typed' },
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('complementary', { name: 'Comments' }),
    ).toBeNull();

    select(root, 4, 9);
    fireEvent.click(await screen.findByRole('button', { name: 'Comment' }));
    expect(screen.getByLabelText('Comment')).toHaveValue('Half typed');
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    const [, init] = apiFetch.mock.calls[1]!;
    expect(JSON.parse(init!.body as string).selector.exact).toBe('quick');
  });

  it('posts with Ctrl+Enter from the comment box', async () => {
    const root = mountContent();
    apiFetch
      .mockReturnValueOnce(jsonResponse({ annotations: [] }))
      .mockReturnValueOnce(
        jsonResponse({ annotation: annotation({ id: 'a3', note: 'Hi' }) }, 201),
      );
    renderOverlay();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    select(root);
    fireEvent.click(await screen.findByRole('button', { name: 'Comment' }));
    const box = screen.getByLabelText('Comment');
    fireEvent.change(box, { target: { value: 'Hi' } });
    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
  });

  it('pushes the bar below a fixed navbar', async () => {
    const nav = document.createElement('header');
    nav.className = 'site-navbar';
    nav.style.position = 'fixed';
    nav.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 64);
    document.body.appendChild(nav);
    mountContent();
    apiFetch.mockReturnValueOnce(jsonResponse({ annotations: [] }));
    renderOverlay();
    await waitFor(() =>
      expect(
        document.querySelector<HTMLElement>('.fs-comments-bar'),
      ).toHaveStyle({ marginTop: '64px' }),
    );
    expect(
      document.documentElement.style.getPropertyValue('--fs-comments-top'),
    ).toBe('64px');
  });

  it('renders nothing when the page has no Markdown root to annotate', async () => {
    apiFetch.mockReturnValueOnce(jsonResponse({ annotations: [annotation()] }));
    renderOverlay();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('.fs-comments-bar')).toBeNull();
  });
});

describe('placeAddButton', () => {
  const viewport = { width: 400, height: 800 };

  it('sits just below the selection', () => {
    expect(
      placeAddButton({ top: 100, bottom: 120, left: 50 }, viewport),
    ).toEqual({ top: 128, left: 50 });
  });

  it('stays inside the right edge', () => {
    expect(
      placeAddButton({ top: 100, bottom: 120, left: 380 }, viewport).left,
    ).toBe(400 - 110 - 8);
  });

  it('stays inside the left edge', () => {
    expect(
      placeAddButton({ top: 100, bottom: 120, left: -40 }, viewport).left,
    ).toBe(8);
  });

  it('goes above the selection when there is no room below', () => {
    expect(
      placeAddButton({ top: 760, bottom: 780, left: 50 }, viewport).top,
    ).toBe(760 - 36 - 8);
  });
});

describe('formatRelative', () => {
  const now = Date.parse('2026-10-18T12:00:00Z');

  it('says how long ago, in the largest whole unit', () => {
    expect(formatRelative('2026-10-16T12:00:00Z', now)).toMatch(/2 days ago/);
    expect(formatRelative('2026-10-18T07:00:00Z', now)).toMatch(/5 hours ago/);
    expect(formatRelative('2026-10-18T11:59:30Z', now)).toBe('just now');
  });
});
