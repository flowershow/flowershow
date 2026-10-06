import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import FsImage from './fs-image';

beforeAll(() => {
  // jsdom doesn't implement modal dialogs.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const lightbox = () =>
  document.querySelector<HTMLDialogElement>('dialog.image-lightbox');

describe('FsImage click-to-enlarge', () => {
  it.each([
    ['plain images', {}],
    ['optimized images', { className: 'internal', 'data-fs-width': 300 }],
  ])('opens %s full size in a lightbox', (_, extraProps) => {
    render(<FsImage src="/photo.png" alt="Photo" {...extraProps} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Enlarge image: Photo' }),
    );

    expect(lightbox()?.open).toBe(true);
    // The original, not a resized next/image variant.
    expect(lightbox()?.querySelector('img')?.getAttribute('src')).toBe(
      '/photo.png',
    );
  });

  it('opens from the keyboard', () => {
    render(<FsImage src="/photo.png" alt="Photo" />);
    const trigger = screen.getByRole('button', {
      name: 'Enlarge image: Photo',
    });

    expect(trigger.tabIndex).toBe(0);
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(lightbox()?.open).toBe(true);
  });

  it('shows a spinner until the original has loaded', async () => {
    let loaded!: () => void;
    HTMLImageElement.prototype.decode = () =>
      new Promise<void>((resolve) => (loaded = resolve));
    const spinner = () => lightbox()?.querySelector('.image-lightbox-spinner');
    render(<FsImage src="/photo.png" alt="Photo" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Enlarge image: Photo' }),
    );
    expect(spinner()).not.toBeNull();
    expect(lightbox()).toHaveAttribute('aria-busy', 'true');

    await act(async () => loaded());
    expect(spinner()).toBeNull();
    expect(lightbox()).toHaveAttribute('aria-busy', 'false');
    // @ts-expect-error restore jsdom's missing implementation
    delete HTMLImageElement.prototype.decode;
  });

  it('closes when the lightbox is clicked', () => {
    render(<FsImage src="/photo.png" alt="Photo" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Enlarge image: Photo' }),
    );
    fireEvent.click(lightbox()!);

    expect(lightbox()).toBeNull();
  });

  it.each([
    [
      'linked images',
      <a key="a" href="/x">
        <FsImage src="/badge.png" alt="Badge" />
      </a>,
    ],
    [
      'canvas images',
      <div key="c" className="canvas-container">
        <FsImage src="/badge.png" alt="Badge" />
      </div>,
    ],
  ])('leaves %s alone', (_, content) => {
    render(content);
    const img = screen.getByAltText('Badge');

    expect(img).not.toHaveAttribute('role', 'button');
    expect(img).not.toHaveClass('image-lightbox-trigger');
    fireEvent.click(img);
    expect(lightbox()).toBeNull();
  });
});
