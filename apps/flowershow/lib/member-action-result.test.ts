import { TRPCClientError } from '@trpc/client';
import { TRPCError } from '@trpc/server';
import { describe, expect, it } from 'vitest';
import { toResult } from './member-action-result';

describe('toResult', () => {
  it('returns an empty result on success', async () => {
    expect(await toResult(async () => 1)).toEqual({});
  });
  it('shows the message of a TRPCClientError', async () => {
    const err = TRPCClientError.from({
      error: {
        message: 'Inviting editors requires a Premium plan',
        code: -32003,
        data: { code: 'FORBIDDEN', httpStatus: 403, path: 'x' },
      },
    } as never);
    expect(
      await toResult(async () => {
        throw err;
      }),
    ).toEqual({ error: 'Inviting editors requires a Premium plan' });
  });
  it('shows the message of a TRPCError', async () => {
    expect(
      await toResult(async () => {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nope' });
      }),
    ).toEqual({ error: 'Nope' });
  });
  it('hides unexpected errors', async () => {
    expect(
      await toResult(async () => {
        throw new Error('db password leaked');
      }),
    ).toEqual({ error: 'Something went wrong. Please try again.' });
  });
});
