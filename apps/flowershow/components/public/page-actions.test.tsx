import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aiPrompt, chatGptUrl, claudeUrl, PageActions } from './page-actions';

const MD_URL = 'https://docs.example.com/docs/setup.md';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AI links', () => {
  it('ask the assistant to read the page’s Markdown URL', () => {
    expect(aiPrompt(MD_URL)).toBe(`Read ${MD_URL} and help me with it.`);
    expect(chatGptUrl(MD_URL)).toBe(
      `https://chatgpt.com/?q=${encodeURIComponent(aiPrompt(MD_URL))}`,
    );
    expect(claudeUrl(MD_URL)).toBe(
      `https://claude.ai/new?q=${encodeURIComponent(aiPrompt(MD_URL))}`,
    );
  });
});

describe('PageActions', () => {
  const openMenu = () =>
    fireEvent.click(screen.getByRole('button', { name: 'More page actions' }));

  it('lists view as Markdown and the AI links in its menu', async () => {
    render(<PageActions markdownPath="/docs/setup.md" markdownUrl={MD_URL} />);
    openMenu();
    expect(
      (
        await screen.findByRole('menuitem', { name: /View as Markdown/ })
      ).getAttribute('href'),
    ).toBe('/docs/setup.md');
    expect(
      screen
        .getByRole('menuitem', { name: /Open in ChatGPT/ })
        .getAttribute('href'),
    ).toBe(chatGptUrl(MD_URL));
    expect(
      screen
        .getByRole('menuitem', { name: /Open in Claude/ })
        .getAttribute('href'),
    ).toBe(claudeUrl(MD_URL));
  });

  it('leaves out the AI links when an assistant could not read the page', async () => {
    render(
      <PageActions
        markdownPath="/docs/setup.md"
        markdownUrl={MD_URL}
        showAiLinks={false}
      />,
    );
    openMenu();
    await screen.findByRole('menuitem', { name: /View as Markdown/ });
    expect(screen.queryByRole('menuitem', { name: /ChatGPT/ })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /Claude/ })).toBeNull();
  });

  it('copies the page’s Markdown to the clipboard', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('# Setup\n', { status: 200 }));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('ClipboardItem', undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<PageActions markdownPath="/docs/setup.md" markdownUrl={MD_URL} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy page/ }));

    expect(await screen.findByText('Copied')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/docs/setup.md');
    expect(writeText).toHaveBeenCalledWith('# Setup\n');
  });

  it('says so when copying fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 404 })),
    );
    vi.stubGlobal('ClipboardItem', undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    });

    render(<PageActions markdownPath="/docs/setup.md" markdownUrl={MD_URL} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy page/ }));

    expect(await screen.findByText('Copy failed')).toBeTruthy();
  });
});
