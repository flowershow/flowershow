import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AnnotationsList from './annotations-list';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ANNOTATION = {
  id: 'ann-1',
  siteId: 'site-1',
  path: 'notes/draft.md',
  pageUrl: 'https://notes-ada.flowershow.me/notes/draft',
  selector: { exact: 'brown fox', prefix: '', suffix: '', start: 10, end: 19 },
  note: '<img src=x onerror=alert(1)> make it red',
  authorName: null,
  status: 'open' as const,
  pageEdited: true,
  createdAt: '2026-10-03T10:00:00.000Z',
};
const handlers = () => ({
  setStatus: vi.fn().mockResolvedValue(undefined),
  deleteAnnotation: vi.fn().mockResolvedValue(undefined),
  deleteAll: vi.fn().mockResolvedValue(undefined),
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('AnnotationsList', () => {
  it('shows an empty state', () => {
    render(<AnnotationsList annotations={[]} {...handlers()} />);
    expect(screen.getByText(/No annotations yet/)).toBeInTheDocument();
  });

  it('renders notes as plain text with status labels and deletes one', async () => {
    const h = handlers();
    render(<AnnotationsList annotations={[ANNOTATION]} {...h} />);
    expect(
      screen.getByText('<img src=x onerror=alert(1)> make it red'),
    ).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('Page edited since note')).toBeInTheDocument();
    expect(screen.getByText(/Anonymous/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(h.deleteAnnotation).toHaveBeenCalledWith('ann-1'),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('resolves and reopens', async () => {
    const h = handlers();
    const { rerender } = render(
      <AnnotationsList annotations={[ANNOTATION]} {...h} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    await waitFor(() =>
      expect(h.setStatus).toHaveBeenCalledWith('ann-1', 'resolved'),
    );
    rerender(
      <AnnotationsList
        annotations={[{ ...ANNOTATION, status: 'resolved' }]}
        {...h}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    await waitFor(() =>
      expect(h.setStatus).toHaveBeenCalledWith('ann-1', 'open'),
    );
  });

  it('deletes all after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const h = handlers();
    render(<AnnotationsList annotations={[ANNOTATION]} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete all' }));
    await waitFor(() => expect(h.deleteAll).toHaveBeenCalled());
  });
});
