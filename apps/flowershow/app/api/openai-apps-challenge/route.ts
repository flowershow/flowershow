import { env } from '@/env.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /.well-known/openai-apps-challenge, rewritten here by middleware: the
 * domain-verification token OpenAI's plugin portal asks for, as plain text.
 */
export function GET() {
  const token = env.OPENAI_APPS_CHALLENGE;
  if (!token) return new Response('Not found', { status: 404 });
  return new Response(token, { headers: { 'Content-Type': 'text/plain' } });
}
