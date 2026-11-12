/**
 * Log in as a seeded test-env user without OAuth: mints a NextAuth session
 * JWT with the local NEXTAUTH_SECRET and writes it as a Playwright storage
 * state, so a browser (or an agent driving one) opens the dashboard signed in.
 *
 * Local only: refuses a non-local database, and the cookie is for
 * .flowershow.local (the dev cookie domain in server/auth.ts).
 *
 * USAGE (from apps/flowershow):
 *   npx tsx --env-file=.env scripts/test-env/login.ts te-pro
 *   # -> test-results/test-env/auth/te-pro.json (gitignored)
 *
 * The browser must resolve *.flowershow.local to 127.0.0.1: either /etc/hosts
 * entries, or launch Chromium with
 *   --host-resolver-rules="MAP *.flowershow.local 127.0.0.1"
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { encode } from 'next-auth/jwt';
import { assertLocalDatabase } from './seed';

const MAX_AGE = 24 * 60 * 60;

async function main() {
  const username = process.argv[2];
  if (!username) throw new Error('Usage: login.ts <username>');
  assertLocalDatabase(process.env.POSTGRES_PRISMA_URL);
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set.');

  const prisma = new PrismaClient();
  const user = await prisma.user
    .findUnique({ where: { username } })
    .finally(() => prisma.$disconnect());
  if (!user) throw new Error(`No user ${username}; run seed.ts first.`);

  // Same claims the jwt callback in server/auth.ts puts on a real session.
  const token = await encode({
    secret,
    maxAge: MAX_AGE,
    token: {
      sub: user.id,
      id: user.id,
      name: user.name ?? user.username,
      username: user.username,
      email: user.email,
      image: user.image ?? '',
      role: user.role,
      // No GitHub connection in the test env.
      accessToken: '',
    },
  });

  const state = {
    cookies: [
      {
        name: 'next-auth.session-token',
        value: token,
        domain: '.flowershow.local',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + MAX_AGE,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  };
  const out = path.join('test-results', 'test-env', 'auth', `${username}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(state, null, 2));
  console.log(out);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
