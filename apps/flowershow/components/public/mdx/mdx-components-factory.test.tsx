import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mdxComponentsFactory } from './mdx-components-factory';

vi.mock('./pdf-viewer', () => ({
  PdfViewer: () => <div data-testid="pdf-viewer" />,
}));

vi.mock('./fs-image', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="fs-image" data-props={JSON.stringify(props)} />
  ),
}));

afterEach(() => {
  cleanup();
});

describe('mdxComponentsFactory', () => {
  it('maps markdown img elements to FsImage', () => {
    const components = mdxComponentsFactory({
      blob: { path: 'notes/page.mdx' } as any,
      site: {
        id: 'site-1',
        customDomain: null,
      } as any,
    });

    expect(components.img).toBeDefined();

    const ImageComponent = components.img as React.ComponentType<any>;
    render(<ImageComponent src="/media/photo.png" alt="Photo" />);

    expect(screen.getByTestId('fs-image')).toBeInTheDocument();
  });

  it('injects DB dimensions as data-intrinsic attributes when no explicit dimensions are set', () => {
    const imageDimensions = {
      '/media/photo.png': { width: 1024, height: 768 },
    };

    const components = mdxComponentsFactory({
      blob: { path: 'notes/page.mdx' } as any,
      site: { id: 'site-1', customDomain: null } as any,
      imageDimensions,
    });

    const ImageComponent = components.img as React.ComponentType<any>;
    render(<ImageComponent src="/media/photo.png" alt="Photo" />);

    const image = screen.getByTestId('fs-image');
    const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

    expect(props['data-intrinsic-width']).toBe(1024);
    expect(props['data-intrinsic-height']).toBe(768);
    // Should NOT set standard width/height
    expect(props.width).toBeUndefined();
    expect(props.height).toBeUndefined();
  });

  it('preserves author-explicit dimensions over DB dimensions', () => {
    const imageDimensions = {
      '/media/photo.png': { width: 1024, height: 768 },
    };

    const components = mdxComponentsFactory({
      blob: { path: 'notes/page.mdx' } as any,
      site: { id: 'site-1', customDomain: null } as any,
      imageDimensions,
    });

    const ImageComponent = components.img as React.ComponentType<any>;
    render(
      <ImageComponent
        src="/media/photo.png"
        alt="Photo"
        width="250"
        height="100"
      />,
    );

    const image = screen.getByTestId('fs-image');
    const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

    expect(props.width).toBe('250');
    expect(props.height).toBe('100');
  });
});
