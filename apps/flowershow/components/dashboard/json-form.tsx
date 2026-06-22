'use client';

import { useParams, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import LoadingDots from '@/components/icons/loading-dots';
import clsx from 'clsx';

export default function JsonForm({
  title,
  description,
  helpText,
  placeholder,
  fieldName,
  defaultValue,
  handleSubmit,
}: {
  title: string;
  description: string;
  helpText?: ReactNode;
  placeholder?: string;
  fieldName: string;
  defaultValue: unknown;
  handleSubmit: (id: string, value: unknown) => Promise<void>;
}) {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [text, setText] = useState(
    defaultValue != null ? JSON.stringify(defaultValue, null, 2) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let parsed: unknown;
    if (text.trim() === '') {
      parsed = null;
    } else {
      try {
        parsed = JSON.parse(text);
      } catch (err: unknown) {
        setError(
          `Invalid JSON: ${err instanceof Error ? err.message : 'parse error'}`,
        );
        return;
      }
    }

    try {
      setPending(true);
      await handleSubmit(id, parsed);
      router.refresh();
      toast.success(`${title} updated.`);
    } catch (err: unknown) {
      toast.error(
        `Error: ${err instanceof Error ? err.message : 'Failed to update.'}`,
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      data-testid={`config-${fieldName}`}
      onSubmit={onSubmit}
      className="isolate rounded-lg border border-stone-200 bg-white"
    >
      <div className="flex flex-col space-y-4 p-5 sm:p-10">
        <h2 className="font-dashboard-heading text-xl">{title}</h2>
        <p className="text-sm text-stone-500">{description}</p>
        <textarea
          rows={6}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          disabled={pending}
          placeholder={placeholder ?? 'null'}
          className="w-full rounded-md border border-stone-300 font-mono text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      <div className="flex items-center justify-between rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 sm:px-10">
        <div className="text-sm text-stone-500">{helpText}</div>
        <button
          type="submit"
          disabled={pending}
          className={clsx(
            'flex h-8 w-32 shrink-0 items-center justify-center space-x-2 rounded-md border px-2 py-1 text-sm transition-all focus:outline-none sm:h-10',
            pending
              ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
              : 'border-black bg-black text-white hover:bg-white hover:text-black',
          )}
          data-testid={`save-${fieldName}`}
        >
          {pending ? <LoadingDots color="#808080" /> : <p>Save Changes</p>}
        </button>
      </div>
    </form>
  );
}
