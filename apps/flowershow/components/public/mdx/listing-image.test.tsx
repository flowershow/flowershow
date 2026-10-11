import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/image', () => ({
  default: (p: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-fill={String(!!p.fill)}
      data-sizes={p.sizes}
      data-loading={p.loading}
      data-w={p.width}
      className={p.className}
      src={p.src}
      alt={p.alt}
    />
  ),
}));
import ListingImage from './listing-image';

describe('ListingImage', () => {
  it('media: next/image fill with the given sizes, lazy, not zoomable', () => {
    const { container } = render(
      <ListingImage
        src="http://h/a.jpg"
        sizes="(min-width: 1024px) 16rem, 100vw"
        variant="media"
      />,
    );
    const img = container.querySelector('img.list-component-item-media-img')!;
    expect(img.getAttribute('data-fill')).toBe('true');
    expect(img.getAttribute('data-sizes')).toBe(
      '(min-width: 1024px) 16rem, 100vw',
    );
    expect(img.getAttribute('data-loading')).toBe('lazy');
    expect(img.getAttribute('alt')).toBe('');
    expect(
      container.querySelector('[data-zoomable], .zoomable-image'),
    ).toBeNull();
  });
  it('avatar: fixed 20px (one size; CSS agrees)', () => {
    const { container } = render(
      <ListingImage src="http://h/ada.jpg" variant="avatar" />,
    );
    expect(
      container
        .querySelector('img.list-component-item-author-avatar')!
        .getAttribute('data-w'),
    ).toBe('20');
  });
  it('renders nothing without a src', () => {
    expect(render(<ListingImage />).container.innerHTML).toBe('');
  });
});
