import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import List from './list';

// Mock the tRPC React API
vi.mock('@/trpc/react', () => ({
  api: {
    site: {
      getListComponentItems: {
        useQuery: vi.fn(),
      },
    },
  },
}));

import { api } from '@/trpc/react';

const mockUseSearchParams = vi.fn();

// Mock next/navigation for this test file
vi.mock('next/navigation', () => {
  const push = vi.fn();
  const replace = vi.fn();
  const back = vi.fn();
  const forward = vi.fn();
  const refresh = vi.fn();
  const prefetch = vi.fn();

  return {
    // what your component actually uses
    useRouter: () => ({
      push,
      replace,
      back,
      forward,
      refresh,
      prefetch,
    }),
    usePathname: vi.fn(() => '/test-path'),
    useSearchParams: () => mockUseSearchParams(),
  };
});

describe('List Component - Pagination Tests', () => {
  beforeEach(() => {
    mockUseSearchParams.mockReset();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    cleanup();
  });

  const mockSiteId = 'test-site-id';

  // Create 4 mock items for testing
  const mockItems = [
    {
      url: '/item-1',
      metadata: {
        title: 'Item 1',
        description: 'Description 1',
        publish: true,
        syntaxMode: 'md' as const,
      },
    },
    {
      url: '/item-2',
      metadata: {
        title: 'Item 2',
        description: 'Description 2',
        publish: true,
        syntaxMode: 'md' as const,
      },
    },
    {
      url: '/item-3',
      metadata: {
        title: 'Item 3',
        description: 'Description 3',
        publish: true,
        syntaxMode: 'md' as const,
      },
    },
    {
      url: '/item-4',
      metadata: {
        title: 'Item 4',
        description: 'Description 4',
        publish: true,
        syntaxMode: 'md' as const,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page size == total items (pageSize=4, total=4)', () => {
    it('should display all items on page 1', () => {
      vi.mocked(api.site.getListComponentItems.useQuery).mockReturnValue({
        data: { items: mockItems },
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<List siteId={mockSiteId} pageSize={4} />);

      // Should display all 4 items
      const articles = container.querySelectorAll('.list-component-item');
      expect(articles).toHaveLength(4);

      // Verify all items are present
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
      expect(screen.getByText('Item 4')).toBeInTheDocument();
    });

    it('should not display pagination', () => {
      vi.mocked(api.site.getListComponentItems.useQuery).mockReturnValue({
        data: { items: mockItems },
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<List siteId={mockSiteId} pageSize={4} />);

      const pagination = container.querySelector('.list-component-pagination');
      expect(pagination).not.toBeInTheDocument();
    });
  });

  describe('PageSize < total items (pageSize=3, total=4)', () => {
    it('should display 3 items on page 1', () => {
      vi.mocked(api.site.getListComponentItems.useQuery).mockReturnValue({
        data: { items: mockItems },
        isLoading: false,
        error: null,
      } as any);
      mockUseSearchParams.mockReturnValue(new URLSearchParams({ page: '1' }));

      const { container } = render(<List siteId={mockSiteId} pageSize={3} />);

      // Should display only 3 items on page 1
      const articles = container.querySelectorAll('.list-component-item');
      expect(articles).toHaveLength(3);

      // Verify first 3 items are present
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();

      // Item 4 should not be on page 1
      expect(screen.queryByText('Item 4')).not.toBeInTheDocument();
    });

    it('should display 1 item on page 2', () => {
      vi.mocked(api.site.getListComponentItems.useQuery).mockReturnValue({
        data: { items: mockItems },
        isLoading: false,
        error: null,
      } as any);

      mockUseSearchParams.mockReturnValue(new URLSearchParams({ page: '2' }));

      const { container } = render(<List siteId={mockSiteId} pageSize={3} />);

      // Should display only 1 item on page 2
      const articles = container.querySelectorAll('.list-component-item');
      expect(articles).toHaveLength(1);

      // Only Item 4 should be on page 2
      expect(screen.getByText('Item 4')).toBeInTheDocument();

      // Items 1-3 should not be on page 2
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Item 3')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should not paginate when pageSize is not provided', () => {
      vi.mocked(api.site.getListComponentItems.useQuery).mockReturnValue({
        data: { items: mockItems },
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<List siteId={mockSiteId} />);

      // Should display all items without pagination
      const articles = container.querySelectorAll('.list-component-item');
      expect(articles).toHaveLength(4);

      // No pagination should be displayed
      const pagination = screen.queryByTestId('pagination');
      expect(pagination).not.toBeInTheDocument();
    });

    it('should handle empty items array', () => {
      vi.mocked(api.site.getListComponentItems.useQuery).mockReturnValue({
        data: { items: [] },
        isLoading: false,
        error: null,
      } as any);

      render(<List siteId={mockSiteId} pageSize={3} />);

      // Should display "No items found" message
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('should handle page number beyond available pages', () => {
      vi.mocked(api.site.getListComponentItems.useQuery).mockReturnValue({
        data: { items: mockItems },
        isLoading: false,
        error: null,
      } as any);

      mockUseSearchParams.mockReturnValue(new URLSearchParams({ page: '5' }));

      const { container } = render(<List siteId={mockSiteId} pageSize={3} />);

      // Should display no items (slice returns empty array)
      const articles = container.querySelectorAll('.list-component-item');
      expect(articles).toHaveLength(0);
    });

    it('should display error state', () => {
      vi.mocked(api.site.getListComponentItems.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: 'Failed to load items' },
      } as any);

      render(<List siteId={mockSiteId} />);

      expect(
        screen.getByText('Error loading items: Failed to load items'),
      ).toBeInTheDocument();
    });
  });
});
