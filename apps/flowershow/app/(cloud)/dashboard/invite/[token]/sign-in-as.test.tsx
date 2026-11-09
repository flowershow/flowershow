import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const signIn = vi.fn();
vi.mock('next-auth/react', () => ({
  signIn: (...a: unknown[]) => signIn(...a),
}));

import SignInAs from './sign-in-as';

beforeEach(() => {
  signIn.mockReset();
});
afterEach(cleanup);

const click = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Sign in with ada@example.com' }),
  );

it('requests an email link back to the invite without redirecting', async () => {
  signIn.mockResolvedValue({ error: null });
  render(<SignInAs email="ada@example.com" callbackUrl="/invite/tok" />);
  click();
  expect(signIn).toHaveBeenCalledWith('email', {
    email: 'ada@example.com',
    callbackUrl: '/invite/tok',
    redirect: false,
  });
  await waitFor(() =>
    expect(
      screen.getByText(
        'Check your inbox at ada@example.com for a sign-in link.',
      ),
    ).toBeTruthy(),
  );
});

it('shows an error when the link could not be sent', async () => {
  signIn.mockResolvedValue({ error: 'EmailSignin' });
  render(<SignInAs email="ada@example.com" callbackUrl="/invite/tok" />);
  click();
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(screen.queryByText(/Check your inbox/)).toBeNull();
});

it('shows an error when sign-in throws', async () => {
  signIn.mockImplementation(() => {
    throw new Error('network');
  });
  render(<SignInAs email="ada@example.com" callbackUrl="/invite/tok" />);
  click();
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
});
