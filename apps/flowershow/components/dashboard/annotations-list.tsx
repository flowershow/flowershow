'use client';

import type { Annotation } from '@flowershow/api-contract';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const buttonClass =
  'rounded-md border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-900';

export default function AnnotationsList({
  annotations,
  setStatus,
  deleteAnnotation,
  deleteAll,
}: {
  annotations: Annotation[];
  setStatus: (id: string, status: 'open' | 'resolved') => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  deleteAll: () => Promise<void>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (annotations.length === 0) {
    return (
      <p className="text-sm text-stone-500 dark:text-zinc-400">
        No annotations yet.
      </p>
    );
  }

  const run = async (
    key: string,
    action: () => Promise<void>,
    done: string,
  ) => {
    setBusy(key);
    try {
      await action();
      toast.success(done);
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const onDeleteAll = () => {
    if (
      !window.confirm(
        `Delete all ${annotations.length} annotations on this site? This can't be undone.`,
      )
    )
      return;
    void run('all', deleteAll, 'All annotations deleted');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDeleteAll}
          disabled={busy !== null}
          className={`${buttonClass} text-red-600`}
        >
          Delete all
        </button>
      </div>
      <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white dark:divide-zinc-700 dark:border-zinc-700 dark:bg-zinc-950">
        {annotations.map((annotation) => {
          const resolved = annotation.status === 'resolved';
          return (
            <li key={annotation.id} className="flex flex-col gap-2 p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {annotation.pageUrl ? (
                  <a
                    className="font-mono text-stone-500 underline dark:text-zinc-400"
                    href={annotation.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {annotation.path}
                  </a>
                ) : (
                  <span className="font-mono text-stone-500 dark:text-zinc-400">
                    {annotation.path}
                  </span>
                )}
                <span className="rounded-full bg-stone-100 px-2 py-0.5 dark:bg-zinc-800">
                  {resolved ? '✓ Resolved' : 'Open'}
                </span>
                {annotation.pageEdited && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    Page edited since note
                  </span>
                )}
              </div>
              <blockquote className="border-l-2 border-stone-300 pl-3 text-sm italic text-stone-600 dark:border-zinc-600 dark:text-zinc-300">
                “{annotation.selector.exact}”
              </blockquote>
              <p className="whitespace-pre-wrap text-sm text-stone-900 dark:text-zinc-100">
                {annotation.note}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-zinc-400">
                <span>
                  {annotation.authorName || 'Anonymous'} ·{' '}
                  {new Date(annotation.createdAt).toLocaleString()} ·{' '}
                  <code>{annotation.id}</code>
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    className={buttonClass}
                    onClick={() =>
                      run(
                        annotation.id,
                        () =>
                          setStatus(
                            annotation.id,
                            resolved ? 'open' : 'resolved',
                          ),
                        resolved
                          ? 'Annotation reopened'
                          : 'Annotation resolved',
                      )
                    }
                  >
                    {resolved ? 'Reopen' : 'Resolve'}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    className={`${buttonClass} text-red-600`}
                    onClick={() =>
                      run(
                        annotation.id,
                        () => deleteAnnotation(annotation.id),
                        'Annotation deleted',
                      )
                    }
                  >
                    Delete
                  </button>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
