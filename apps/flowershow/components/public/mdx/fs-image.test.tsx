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
  it('renders markdown images through next/image', () => {
    render(<FsImage src="/demo.png" alt="Demo" width={320} height={200} />);

    expect(screen.getByTestId('next-image')).toBeInTheDocument();
  });

  it('preserves custom class names', () => {
    render(
      <FsImage
        src="/demo.png"
        alt="Demo"
        width={320}
        height={200}
        className="rounded-lg"
      />,
    );

    const image = screen.getByTestId('next-image');
    const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

    expect(props.className).toContain('not-prose');
    expect(props.className).toContain('rounded-lg');
  });

  it('uses numeric dimensions for sized rendering', () => {
    render(<FsImage src="/demo.png" alt="Demo" width={1024} height={768} />);

    const image = screen.getByTestId('next-image');
    const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

    expect(props.width).toBe(1024);
    expect(props.height).toBe(768);
    // Author-explicit: no sizes, fixed pixel rendering
    expect(props.sizes).toBeUndefined();
  });

  it('uses intrinsic dimensions for responsive rendering with aspect ratio', () => {
    render(
      <FsImage
        src="/demo.png"
        alt="Demo"
        {...({
          'data-intrinsic-width': 4000,
          'data-intrinsic-height': 3000,
        } as any)}
      />,
    );

    const image = screen.getByTestId('next-image');
    const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

    // Intrinsic dimensions passed for aspect ratio, not fixed sizing
    expect(props.width).toBe(4000);
    expect(props.height).toBe(3000);
    // Responsive: uses sizes
    expect(props.sizes).toBeDefined();
    // CSS drives the rendered size, not the width/height attributes
    expect(props.style).toEqual({ width: '100%', height: 'auto' });
  });

  it('prefers author-explicit dimensions over intrinsic dimensions', () => {
    render(
      <FsImage
        src="/demo.png"
        alt="Demo"
        width={300}
        height={200}
        {...({
          'data-intrinsic-width': 4000,
          'data-intrinsic-height': 3000,
        } as any)}
      />,
    );

    const image = screen.getByTestId('next-image');
    const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

    // Author-explicit dimensions win: fixed pixel rendering
    expect(props.width).toBe(300);
    expect(props.height).toBe(200);
    expect(props.sizes).toBeUndefined();
    // Style uses fixed pixel size, not responsive 100%
    expect(props.style.width).toBe('300px');
    expect(props.style.height).toBe('200px');
  });

  it('falls back to responsive mode when no dimensions provided', () => {
    render(<FsImage src="/demo.png" alt="Demo" />);

    const image = screen.getByTestId('next-image');
    const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

    expect(props.width).toBe(0);
    expect(props.height).toBe(0);
    expect(props.sizes).toBeDefined();
  });
});
