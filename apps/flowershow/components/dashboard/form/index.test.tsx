import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validDomainRegex } from '@/lib/domains';
import Form from './index';

// Next navigation hooks used by the Form component.
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'site-1' }),
  useRouter: () => ({ refresh }),
}));

// Toast surface — we assert on error() to check client-side validation.
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  },
}));

// The domain-config panels hit browser-only APIs; stub them out.
vi.mock('./domain-configuration', () => ({ default: () => null }));
vi.mock('./domain-status', () => ({ default: () => null }));

function renderCustomDomainForm(defaultValue: string, handleSubmit = vi.fn()) {
  render(
    <Form
      title="Custom Domain"
      description="The custom domain for your site."
      inputAttrs={{
        name: 'customDomain',
        type: 'text',
        defaultValue,
        pattern: validDomainRegex.source,
      }}
      handleSubmit={handleSubmit}
    />,
  );
  return handleSubmit;
}

describe('Form — custom domain validation', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Regression: #1336 — clearing the field is the only way to remove a custom
  // domain, but the client pattern check used to reject the empty value and
  // abort the submit, so the request never reached the server.
  it('submits an empty value to clear the custom domain', async () => {
    const handleSubmit = renderCustomDomainForm('example.com');

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith({
        id: 'site-1',
        key: 'customDomain',
        value: '',
      }),
    );
    expect(toastError).not.toHaveBeenCalled();
  });

  it('rejects a malformed domain before submitting', async () => {
    const handleSubmit = renderCustomDomainForm('');

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'not a domain' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  // Users are auto-assigned a subdomain on our site domain, so they must not be
  // able to claim one of our own domains as a custom domain. The configured
  // NEXT_PUBLIC_SITE_DOMAIN in tests is `test.localhost` (see vitest.setup.ts).
  it('rejects a subdomain of our site domain before submitting', async () => {
    const handleSubmit = renderCustomDomainForm('');

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'tom.test.localhost' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid domain', async () => {
    const handleSubmit = renderCustomDomainForm('');

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith({
        id: 'site-1',
        key: 'customDomain',
        value: 'example.com',
      }),
    );
    expect(toastError).not.toHaveBeenCalled();
  });
});
