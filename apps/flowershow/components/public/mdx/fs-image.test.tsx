import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FsImage from './fs-image';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="next-image" data-props={JSON.stringify(props)} />
  ),
}));

afterEach(() => {
  cleanup();
});

describe('FsImage', () => {
  describe('external images (no internal class)', () => {
    it('renders as plain img element without next/image', () => {
      render(<FsImage src="/demo.png" alt="Demo" width={320} height={200} />);

      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(screen.queryByTestId('next-image')).not.toBeInTheDocument();
    });

    it('preserves custom class names on plain img', () => {
      render(
        <FsImage
          src="/demo.png"
          alt="Demo"
          width={320}
          height={200}
          className="rounded-lg"
        />,
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('rounded-lg');
    });
  });

  describe('internal images (wiki-link syntax)', () => {
    it('renders markdown images through next/image', () => {
      render(
        <FsImage
          src="/demo.png"
          alt="Demo"
          className="internal"
          data-fs-width={320}
          data-fs-height={200}
        />,
      );

      expect(screen.getByTestId('next-image')).toBeInTheDocument();
    });

    it('preserves custom class names', () => {
      render(
        <FsImage
          src="/demo.png"
          alt="Demo"
          className="internal rounded-lg"
          data-fs-width={320}
          data-fs-height={200}
        />,
      );

      const image = screen.getByTestId('next-image');
      const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

      expect(props.className).toContain('not-prose');
      expect(props.className).toContain('rounded-lg');
    });

    it('uses numeric dimensions for sized rendering', () => {
      render(
        <FsImage
          src="/demo.png"
          alt="Demo"
          className="internal"
          data-fs-width={1024}
          data-fs-height={768}
        />,
      );

      const image = screen.getByTestId('next-image');
      const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

      // When both width and height are provided, uses fill mode with wrapper
      expect(props.fill).toBe(true);
      expect(props.sizes).toContain('1024px');
    });

    it('uses intrinsic dimensions for responsive rendering with aspect ratio', () => {
      render(
        <FsImage
          src="/demo.png"
          alt="Demo"
          className="internal"
          {...({
            'data-fs-intrinsic-width': 4000,
            'data-fs-intrinsic-height': 3000,
          } as any)}
        />,
      );

      const image = screen.getByTestId('next-image');
      const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

      expect(props.width).toBe(4000);
      expect(props.height).toBe(3000);
      expect(props.sizes).toBeDefined();
      expect(props.style).toEqual({
        width: '100%',
        height: 'auto',
        margin: '0 auto',
      });
    });

    it('prefers author-explicit dimensions over intrinsic dimensions', () => {
      render(
        <FsImage
          src="/demo.png"
          alt="Demo"
          className="internal"
          data-fs-width={300}
          data-fs-height={200}
          {...({
            'data-fs-intrinsic-width': 4000,
            'data-fs-intrinsic-height': 3000,
          } as any)}
        />,
      );

      const image = screen.getByTestId('next-image');
      const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

      // Author dimensions win: uses fill mode with author's aspect ratio, not intrinsic
      expect(props.fill).toBe(true);
      expect(props.sizes).toContain('300px');
    });

    it('falls back to responsive mode when no dimensions provided', () => {
      render(<FsImage src="/demo.png" alt="Demo" className="internal" />);

      const image = screen.getByTestId('next-image');
      const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

      expect(props.fill).toBe(true);
      expect(props.sizes).toBeDefined();
    });
  });
});
