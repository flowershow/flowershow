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
