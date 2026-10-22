'use client';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MessageSquareIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/** The prompt sent to ChatGPT / Claude: read the page's Markdown source. */
export function aiPrompt(markdownUrl: string): string {
  return `Read ${markdownUrl} and help me with it.`;
}

export function chatGptUrl(markdownUrl: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(aiPrompt(markdownUrl))}`;
}

export function claudeUrl(markdownUrl: string): string {
  return `https://claude.ai/new?q=${encodeURIComponent(aiPrompt(markdownUrl))}`;
}

type CopyState = 'idle' | 'copied' | 'error';

async function fetchMarkdown(href: string): Promise<string> {
  const res = await fetch(href);
  if (!res.ok) throw new Error(`Failed to fetch ${href}: ${res.status}`);
  return res.text();
}

/**
 * Copies the page's Markdown. Safari only allows clipboard writes inside the
 * click, so the fetch goes into a ClipboardItem promise where supported.
 */
async function copyMarkdown(href: string): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const blob = fetchMarkdown(href).then(
      (text) => new Blob([text], { type: 'text/plain' }),
    );
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/plain': blob }),
    ]);
    return;
  }
  await navigator.clipboard.writeText(await fetchMarkdown(href));
}

/**
 * Page actions beside the title (config `showPageActions`): copy the page as
 * Markdown, view the `.md` source, or open it in ChatGPT / Claude.
 */
export function PageActions({
  markdownPath,
  markdownUrl,
  showAiLinks = true,
}: {
  /** Root-relative path of the page's Markdown source, e.g. `/docs/a.md`. */
  markdownPath: string;
  /** Absolute URL of the same source, for the AI prompt. */
  markdownUrl: string;
  /** Off for password-protected sites: an AI can't read the page. */
  showAiLinks?: boolean;
}) {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(t);
  }, [state]);

  const onCopy = async () => {
    try {
      await copyMarkdown(markdownPath);
      setState('copied');
    } catch {
      setState('error');
    }
  };

  const copyLabel =
    state === 'copied'
      ? 'Copied'
      : state === 'error'
        ? 'Copy failed'
        : 'Copy page';

  return (
    <div className="page-actions">
      <button
        type="button"
        className="page-actions-copy"
        onClick={onCopy}
        aria-live="polite"
        title="Copy this page as Markdown"
      >
        {state === 'copied' ? (
          <CheckIcon className="page-actions-icon" aria-hidden="true" />
        ) : (
          <CopyIcon className="page-actions-icon" aria-hidden="true" />
        )}
        <span>{copyLabel}</span>
      </button>
      <Menu>
        <MenuButton
          className="page-actions-toggle"
          aria-label="More page actions"
        >
          <ChevronDownIcon className="page-actions-icon" aria-hidden="true" />
        </MenuButton>
        <MenuItems className="page-actions-menu" modal={false}>
          <MenuItem>
            <button
              type="button"
              className="page-actions-item"
              onClick={onCopy}
            >
              <CopyIcon className="page-actions-icon" aria-hidden="true" />
              <span className="page-actions-item-text">
                <span className="page-actions-item-title">Copy page</span>
                <span className="page-actions-item-description">
                  Copy this page as Markdown
                </span>
              </span>
            </button>
          </MenuItem>
          <MenuItem>
            <a
              className="page-actions-item"
              href={markdownPath}
              target="_blank"
              rel="noopener"
            >
              <FileTextIcon className="page-actions-icon" aria-hidden="true" />
              <span className="page-actions-item-text">
                <span className="page-actions-item-title">
                  View as Markdown
                </span>
                <span className="page-actions-item-description">
                  Open this page as plain text
                </span>
              </span>
            </a>
          </MenuItem>
          {showAiLinks && (
            <>
              <MenuItem>
                <a
                  className="page-actions-item"
                  href={chatGptUrl(markdownUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageSquareIcon
                    className="page-actions-icon"
                    aria-hidden="true"
                  />
                  <span className="page-actions-item-text">
                    <span className="page-actions-item-title">
                      Open in ChatGPT
                      <ExternalLinkIcon
                        className="page-actions-external"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="page-actions-item-description">
                      Ask questions about this page
                    </span>
                  </span>
                </a>
              </MenuItem>
              <MenuItem>
                <a
                  className="page-actions-item"
                  href={claudeUrl(markdownUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageSquareIcon
                    className="page-actions-icon"
                    aria-hidden="true"
                  />
                  <span className="page-actions-item-text">
                    <span className="page-actions-item-title">
                      Open in Claude
                      <ExternalLinkIcon
                        className="page-actions-external"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="page-actions-item-description">
                      Ask questions about this page
                    </span>
                  </span>
                </a>
              </MenuItem>
            </>
          )}
        </MenuItems>
      </Menu>
    </div>
  );
}
