'use client';

import {
  ChevronDownIcon,
  ChevronRightIcon,
  GitCommitHorizontalIcon,
  InfoIcon,
  LoaderCircleIcon,
} from 'lucide-react';
import { useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import clsx from 'clsx';
import { api } from '@/trpc/react';

type PublishSource =
  | 'github_webhook'
  | 'cli'
  | 'obsidian_plugin'
  | 'dashboard_upload'
  | 'anonymous';
type ChangeType = 'added' | 'updated' | 'deleted';
type FileStatus = 'uploading' | 'success' | 'error' | 'canceled' | 'expired';

interface PublishFile {
  id: string;
  path: string;
  changeType: ChangeType;
  status: FileStatus;
  error: string | null;
}

interface PublishEntry {
  id: string;
  startedAt: Date;
  source: PublishSource;
  gitCommitSha: string | null;
  gitCommitMessage: string | null;
  isInProgress: boolean;
  legacy: boolean;
  counts: {
    added: number;
    updated: number;
    deleted: number;
    errors: number;
    canceled: number;
  };
  files: PublishFile[];
}

const SOURCE_LABELS: Record<PublishSource, string> = {
  github_webhook: 'GitHub',
  cli: 'CLI',
  obsidian_plugin: 'Obsidian',
  dashboard_upload: 'Dashboard',
  anonymous: 'Anonymous',
};

function FileStatusDot({ status }: { status: FileStatus }) {
  return (
    <span
      className={clsx(
        'inline-block h-1.5 w-1.5 rounded-full',
        status === 'success' && 'bg-green-500',
        status === 'error' && 'bg-red-500',
        status === 'uploading' && 'bg-yellow-400',
        status === 'canceled' && 'bg-stone-300',
      )}
    />
  );
}

function ChangeTypeBadge({ changeType }: { changeType: ChangeType }) {
  return (
    <span
      className={clsx(
        'rounded px-1 py-0.5 font-mono text-[10px] uppercase',
        changeType === 'added' && 'bg-green-100 text-green-700',
        changeType === 'updated' && 'bg-blue-100 text-blue-700',
        changeType === 'deleted' && 'bg-stone-100 text-stone-600',
      )}
    >
      {changeType === 'added'
        ? 'add'
        : changeType === 'updated'
          ? 'upd'
          : 'del'}
    </span>
  );
}

function PublishRow({
  entry,
  ghRepository,
}: {
  entry: PublishEntry;
  ghRepository: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(entry.startedAt));

  const shortSha = entry.gitCommitSha?.slice(0, 7);
  const commitUrl =
    ghRepository && entry.gitCommitSha
      ? `https://github.com/${ghRepository}/commit/${entry.gitCommitSha}`
      : null;

  const { added, updated, deleted, errors, canceled } = entry.counts;
  const hasFiles = entry.files.length > 0;

  return (
    <div className="border-b border-stone-100 last:border-0">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-stone-50"
        onClick={() => hasFiles && setExpanded((v) => !v)}
        disabled={!hasFiles}
      >
        <div className="mt-0.5 shrink-0 text-stone-400">
          {hasFiles ? (
            expanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )
          ) : (
            <span className="inline-block h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {entry.isInProgress && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                <LoaderCircleIcon className="h-3 w-3 animate-spin" />
                In progress
              </span>
            )}
            {entry.legacy && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                <InfoIcon className="h-3 w-3" />
                Published
              </span>
            )}
            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
              {SOURCE_LABELS[entry.source]}
            </span>
            <span className="text-xs text-stone-400">{formattedDate}</span>
          </div>

          {entry.gitCommitSha && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
              <GitCommitHorizontalIcon className="h-3 w-3 shrink-0" />
              {commitUrl ? (
                <a
                  href={commitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {shortSha}
                </a>
              ) : (
                <span className="font-mono">{shortSha}</span>
              )}
              {entry.gitCommitMessage && (
                <span className="truncate text-stone-400">
                  {entry.gitCommitMessage}
                </span>
              )}
            </div>
          )}

          {entry.legacy && (
            <p className="mt-1 text-xs text-stone-400">
              {entry.source === 'cli'
                ? 'Upgrade to CLI v2.1.0+ for detailed publish logs.'
                : entry.source === 'obsidian_plugin'
                  ? 'Upgrade to Obsidian plugin v4.1.0+ for detailed publish logs.'
                  : 'Upgrade your client for detailed publish logs.'}
            </p>
          )}

          {hasFiles && (
            <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-stone-500">
              {added > 0 && (
                <span className="text-green-600">+{added} added</span>
              )}
              {updated > 0 && (
                <span className="text-blue-600">{updated} updated</span>
              )}
              {deleted > 0 && <span>{deleted} deleted</span>}
              {errors > 0 && (
                <span className="text-red-600">
                  {errors} error{errors !== 1 ? 's' : ''}
                </span>
              )}
              {canceled > 0 && (
                <span className="text-stone-400">{canceled} canceled</span>
              )}
            </div>
          )}
        </div>
      </button>

      {expanded && hasFiles && (
        <div className="max-h-64 overflow-y-auto border-t border-stone-100 bg-stone-50 px-4 py-2">
          <ul className="divide-y divide-stone-100">
            {entry.files.map((file) => (
              <li key={file.id} className="flex items-center gap-2 py-1.5">
                <FileStatusDot status={file.status} />
                <ChangeTypeBadge changeType={file.changeType} />
                <span className="min-w-0 flex-1 break-all font-mono text-xs text-stone-600">
                  {file.path}
                </span>
                {file.status === 'canceled' && (
                  <span className="ml-2 shrink-0 text-xs text-stone-400">
                    canceled
                  </span>
                )}
                {file.error && (
                  <span
                    className="ml-2 shrink-0 max-w-xs truncate text-xs text-red-500"
                    title={file.error}
                  >
                    {file.error}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface PublishHistoryProps {
  siteId: string;
  ghRepository: string | null;
}

export default function PublishHistory({
  siteId,
  ghRepository,
}: PublishHistoryProps) {
  const { data: publishes, isLoading } = api.site.getPublishHistory.useQuery(
    { id: siteId },
    {
      refetchInterval: (data) =>
        data?.some((p) => p.isInProgress) ? 5000 : false,
    },
  );

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-stone-100 px-4 py-3 last:border-0"
          >
            <div className="flex items-center gap-2">
              <Skeleton width={70} height={18} borderRadius={999} />
              <Skeleton width={60} height={18} borderRadius={4} />
              <Skeleton width={100} height={14} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!publishes || publishes.length === 0) {
    return (
      <p className="text-sm text-stone-400">
        No publishes yet. Your publish history will appear here once you publish
        your site.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
      {publishes.map((entry) => (
        <PublishRow key={entry.id} entry={entry} ghRepository={ghRepository} />
      ))}
    </div>
  );
}
