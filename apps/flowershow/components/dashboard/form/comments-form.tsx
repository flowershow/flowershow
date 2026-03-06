'use client';

import { Switch } from '@headlessui/react';
import clsx from 'clsx';
import { ExternalLinkIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import LoadingDots from '@/components/icons/loading-dots';
import { cn } from '@/lib/utils';
import { SiteUpdateKey } from '@/server/api/types';

interface CommentsFormProps {
  siteId: string;
  enableComments: boolean;
  giscusRepoId: string | null;
  giscusCategoryId: string | null;
  handleSubmit: ({
    id,
    key,
    value,
  }: {
    id: string;
    key: SiteUpdateKey;
    value: string;
  }) => Promise<void>;
}

export default function CommentsForm({
  siteId,
  enableComments,
  giscusRepoId,
  giscusCategoryId,
  handleSubmit,
}: CommentsFormProps) {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [commentsEnabled, setCommentsEnabled] = useState(enableComments);
  const [repoId, setRepoId] = useState(giscusRepoId || '');
  const [categoryId, setCategoryId] = useState(giscusCategoryId || '');
  const [togglePending, setTogglePending] = useState(false);
  const [formPending, setFormPending] = useState(false);

  const onToggleChange = async () => {
    const newValue = !commentsEnabled;
    try {
      setTogglePending(true);
      await handleSubmit({
        id,
        key: SiteUpdateKey.enableComments,
        value: newValue.toString(),
      });
      setCommentsEnabled(newValue);
      router.refresh();
      toast.success('Successfully updated comments setting!');
    } catch {
      toast.error('Failed to enable comments.');
    } finally {
      setTogglePending(false);
    }
  };

  const onGiscusSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setFormPending(true);
      await handleSubmit({
        id,
        key: SiteUpdateKey.giscusRepoId,
        value: repoId,
      });
      await handleSubmit({
        id,
        key: SiteUpdateKey.giscusCategoryId,
        value: categoryId,
      });
      router.refresh();
      toast.success('Giscus settings saved!');
    } catch (error: any) {
      toast.error(
        `Error: ${error?.message ?? 'Failed to save Giscus settings.'}`,
      );
    } finally {
      setFormPending(false);
    }
  };

  return (
    <div className="isolate rounded-lg border border-stone-200 bg-white">
      {/* Header section */}
      <div className="flex flex-col space-y-4 p-5 sm:p-10">
        <h2 className="font-dashboard-heading text-xl">Comments</h2>
        <p className="text-sm text-stone-500">
          Enable comments at the bottom of your site&apos;s pages.
        </p>
        <Switch
          disabled={togglePending}
          checked={commentsEnabled}
          onChange={onToggleChange}
          className={clsx(
            commentsEnabled ? 'bg-indigo-600' : 'bg-gray-200',
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2',
            togglePending && 'cursor-auto opacity-70',
          )}
        >
          <span className="sr-only">Enable comments</span>
          <span
            aria-hidden="true"
            className={clsx(
              commentsEnabled ? 'translate-x-5' : 'translate-x-0',
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            )}
          />
        </Switch>
      </div>

      {/* Giscus fields — shown only when comments are enabled */}
      {commentsEnabled && (
        <form onSubmit={onGiscusSubmit}>
          <div className="border-t border-stone-200 p-5 sm:p-10 flex flex-col space-y-6">
            {/* Giscus Repo ID */}
            <div className="flex flex-col space-y-2">
              <label
                htmlFor="giscusRepoId"
                className="text-sm font-medium text-stone-700"
              >
                Giscus Repository ID
              </label>
              <p className="text-sm text-stone-500">
                The ID of your GitHub repository for Giscus.
              </p>
              <input
                id="giscusRepoId"
                name="giscusRepoId"
                type="text"
                placeholder="R_kgDOxxxxxx"
                value={repoId}
                onChange={(e) => setRepoId(e.target.value)}
                disabled={formPending}
                className="w-full max-w-md rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500"
              />
              <p className="text-xs text-stone-400">
                Find this at{' '}
                <a
                  href="https://giscus.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  giscus.app
                </a>
                . It starts with <code>R_</code>.
              </p>
            </div>

            {/* Giscus Category ID */}
            <div className="flex flex-col space-y-2">
              <label
                htmlFor="giscusCategoryId"
                className="text-sm font-medium text-stone-700"
              >
                Giscus Category ID
              </label>
              <p className="text-sm text-stone-500">
                The ID of the discussion category in your repository.
              </p>
              <input
                id="giscusCategoryId"
                name="giscusCategoryId"
                type="text"
                placeholder="DIC_kwDOxxxxxx"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={formPending}
                className="w-full max-w-md rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500"
              />
              <p className="text-xs text-stone-400">
                Find this at{' '}
                <a
                  href="https://giscus.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  giscus.app
                </a>
                . It starts with <code>DIC_</code>.
              </p>
            </div>
          </div>

          {/* Footer with save button */}
          <div className="flex flex-col items-center justify-between space-y-4 rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 sm:flex-row sm:space-x-4 sm:space-y-0 sm:px-10">
            <p className="w-full text-sm text-stone-500">
              Learn more about{' '}
              <a
                className="underline"
                href="https://flowershow.app/docs/comments"
                target="_blank"
                rel="noopener noreferrer"
              >
                Comments
                <ExternalLinkIcon className="inline h-4" />
              </a>
              .
            </p>
            <button
              type="submit"
              disabled={formPending}
              className={cn(
                'flex h-8 w-32 shrink-0 items-center justify-center space-x-2 rounded-md border px-2 py-1 text-sm transition-all focus:outline-none sm:h-10',
                formPending
                  ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                  : 'border-black bg-black text-white hover:bg-white hover:text-black',
              )}
            >
              {formPending ? (
                <LoadingDots color="#808080" />
              ) : (
                <p>Save Changes</p>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Footer shown when comments are disabled (no save button needed) */}
      {!commentsEnabled && (
        <div className="flex flex-col items-center justify-between space-y-4 rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 sm:flex-row sm:space-x-4 sm:space-y-0 sm:px-10">
          <p className="w-full text-sm text-stone-500">
            Learn more about{' '}
            <a
              className="underline"
              href="https://flowershow.app/docs/comments"
              target="_blank"
              rel="noopener noreferrer"
            >
              Comments
              <ExternalLinkIcon className="inline h-4" />
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
