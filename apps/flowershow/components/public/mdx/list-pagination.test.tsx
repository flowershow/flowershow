import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ListComponentPagination from './list-pagination';

const mockUseSearchParams = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/blog',
  useSearchParams: () => mockUseSearchParams(),
}));

afterEach(cleanup);

describe('ListComponentPagination', () => {
  it('renders one ellipsis per gap, not one per hidden page', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('page=6'));
    const { container } = render(<ListComponentPagination totalPages={12} />);
    expect(
      container.querySelectorAll('.list-component-pagination-ellipsis'),
    ).toHaveLength(2);
    const pages = [
      ...container.querySelectorAll('.list-component-pagination-page-button'),
    ].map((b) => b.textContent);
    expect(pages).toEqual(['1', '4', '5', '6', '7', '8', '12']);
  });
  it('renders no ellipsis when all pages fit', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    const { container } = render(<ListComponentPagination totalPages={4} />);
    expect(
      container.querySelectorAll('.list-component-pagination-ellipsis'),
    ).toHaveLength(0);
  });
});
