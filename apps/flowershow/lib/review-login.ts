import type { User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { env } from '@/env.mjs';
import { verifyReviewPassword } from '@/lib/review-password';
import prisma from '@/server/db';

/**
 * Password sign-in for exactly one account: the one app-directory reviewers
 * (OpenAI's ChatGPT plugin review) use to test the signed-in MCP connector.
 * Their test form takes only an email and password, so GitHub, Google and
 * magic links don't work for them. Only REVIEW_LOGIN_EMAIL can sign in this
 * way, and only while REVIEW_LOGIN_ENABLED=true; otherwise the provider and
 * the form don't exist. Create the account with
 * scripts/seed-review-account.ts.
 *
 * Switching it off stops new sign-ins only: existing sessions (30 days) and
 * the MCP connector's OAuth tokens keep working. To end access, also revoke
 * the account's grants (dashboard → Access tokens) or delete the user.
 */
export const REVIEW_LOGIN_PROVIDER_ID = 'review-login';

type ReviewLoginConfig = { email: string; passwordHash: string };

function reviewLoginConfig(): ReviewLoginConfig | null {
  const email = env.REVIEW_LOGIN_EMAIL;
  const passwordHash = env.REVIEW_LOGIN_PASSWORD_HASH;
  if (env.REVIEW_LOGIN_ENABLED !== 'true' || !email || !passwordHash) {
    return null;
  }
  return { email: email.trim().toLowerCase(), passwordHash };
}

export function reviewLoginEnabled(): boolean {
  return reviewLoginConfig() !== null;
}

async function authorizeReviewLogin(
  credentials: Record<'email' | 'password', string> | undefined,
): Promise<User | null> {
  const config = reviewLoginConfig();
  if (!config || !credentials?.email || !credentials.password) return null;
  if (credentials.email.trim().toLowerCase() !== config.email) return null;
  if (
    !(await verifyReviewPassword(credentials.password, config.passwordHash))
  ) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { email: config.email },
    include: { accounts: { select: { id: true }, take: 1 } },
  });
  // Never a real person's account set here by mistake: the review account
  // has no GitHub or Google sign-in and no admin role.
  if (!user || user.accounts.length > 0 || user.role !== 'USER') return null;
  return {
    id: user.id,
    name: user.name ?? user.username,
    email: user.email,
    image: user.image ?? '',
    username: user.username,
    role: user.role,
  };
}

/** The review-login provider while it is switched on, else nothing. */
export function reviewLoginProviders() {
  if (!reviewLoginEnabled()) return [];
  return [
    CredentialsProvider({
      id: REVIEW_LOGIN_PROVIDER_ID,
      name: 'Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: authorizeReviewLogin,
    }),
  ];
}
