import { TRPCClientError } from '@trpc/client';
import { TRPCError } from '@trpc/server';

export type MemberActionResult = { error?: string };

const GENERIC = 'Something went wrong. Please try again.';

/**
 * Run a member-management call and turn a tRPC failure into a user-readable
 * message. The server `api` client throws `TRPCClientError`; internal errors
 * are never shown.
 */
export async function toResult(
  action: () => Promise<unknown>,
): Promise<MemberActionResult> {
  try {
    await action();
    return {};
  } catch (e) {
    if (e instanceof TRPCClientError) {
      const code = (e.data as { code?: string } | undefined)?.code;
      return { error: code === 'INTERNAL_SERVER_ERROR' ? GENERIC : e.message };
    }
    if (e instanceof TRPCError && e.code !== 'INTERNAL_SERVER_ERROR') {
      return { error: e.message };
    }
    return { error: GENERIC };
  }
}
