'use client';

import { useState } from 'react';

const REASONS = [
  ['phishing', 'Phishing / credential theft'],
  ['malware', 'Malware or harmful downloads'],
  ['spam', 'Spam'],
  ['illegal', 'Illegal content'],
  ['other', 'Other'],
] as const;

const field =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
const label = 'mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300';

export function ReportAbuseForm({ initialUrl }: { initialUrl: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setState('sending');
    try {
      const res = await fetch('/api/report-abuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || 'Something went wrong.');
      }
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <p
        data-testid="report-abuse-sent"
        className="rounded-md bg-green-50 p-4 text-green-800 dark:bg-green-950 dark:text-green-200"
      >
        Thanks, we&apos;ve received your report and will look into it.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="url" className={label}>
          Page URL
        </label>
        <input
          id="url"
          name="url"
          required
          defaultValue={initialUrl}
          placeholder="https://example.flowershow.me/page"
          className={field}
        />
      </div>
      <div>
        <label htmlFor="reason" className={label}>
          Reason
        </label>
        <select id="reason" name="reason" required className={field}>
          {REASONS.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="details" className={label}>
          Details (optional)
        </label>
        <textarea
          id="details"
          name="details"
          rows={4}
          maxLength={5000}
          className={field}
        />
      </div>
      <div>
        <label htmlFor="email" className={label}>
          Your email (optional, if you&apos;d like a reply)
        </label>
        <input id="email" name="email" type="email" className={field} />
      </div>
      {state === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="submit"
        disabled={state === 'sending'}
        className="rounded-lg bg-orange-500 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending…' : 'Send report'}
      </button>
    </form>
  );
}
