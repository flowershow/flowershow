import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const signIn = vi.fn().mockResolvedValue(undefined);
vi.mock('next-auth/react', () => ({
  signIn: (...a: unknown[]) => signIn(...a),
}));

import SignInAs from './sign-in-as';

afterEach(cleanup);

it('signs in by email link back to the invite', () => {
  render(<SignInAs email="ada@example.com" callbackUrl="/invite/tok" />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Sign in with ada@example.com' }),
  );
  expect(signIn).toHaveBeenCalledWith('email', {
    email: 'ada@example.com',
    callbackUrl: '/invite/tok',
  });
});
