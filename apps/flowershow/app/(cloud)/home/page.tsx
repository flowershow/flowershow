'use client';

import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect, useState } from 'react';
import { DropZone } from '@/components/home/drop-zone';
import { PublishModal } from '@/components/home/publish-modal';
import { env } from '@/env.mjs';
import {
  getOrCreateAnonymousUserId,
  setAnonymousToken,
} from '@/lib/client-anonymous-user';
import { getSiteUrlPath } from '@/lib/get-site-url';
import Modal from '@/providers/modal';
import { api } from '@/trpc/react';

const isSecure =
  env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
const protocol = isSecure ? 'https' : 'http';

type State = 'idle' | 'uploading' | 'published' | 'error';

interface FileUploadInfo {
  fileName: string;
  uploadUrl: string;
}

interface PublishResult {
  siteId: string;
  projectName: string;
  files: FileUploadInfo[];
  liveUrl: string;
  ownershipToken: string;
}

const MAX_STORED_SITES = 10;
const STORAGE_KEY = 'flowershow_site_ids';

export default function HomePage() {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [liveUrl, setLiveUrl] = useState<string>('');
  const [siteId, setSiteId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Load site IDs from localStorage on mount
  useEffect(() => {
    loadSiteIds();
  }, []);

  // Fetch full site data from database using tRPC
  const { data: sites, refetch: refetchSites } = api.site.getMany.useQuery(
    { ids: siteIds },
    { enabled: siteIds.length > 0 },
  );

  const loadSiteIds = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setSiteIds(ids);
      }
    } catch (err) {
      console.error('Failed to load site IDs:', err);
    }
  };

  const saveSiteId = (siteId: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const ids = stored ? (JSON.parse(stored) as string[]) : [];

      // Add new site ID at the beginning if not already present
      const updatedIds = [siteId, ...ids.filter((id) => id !== siteId)];

      // Keep only the last MAX_STORED_SITES
      const trimmedIds = updatedIds.slice(0, MAX_STORED_SITES);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedIds));
      setSiteIds(trimmedIds);
    } catch (err) {
      console.error('Failed to save site ID:', err);
    }
  };

  const handleFileSelect = async (files: File[]) => {
    const startTime = Date.now();
    setState('uploading');
    setError('');
    setShowPublishModal(true);

    try {
      // Get or create persistent anonymous user ID for this browser
      const anonymousUserId = getOrCreateAnonymousUserId();

      // Calculate SHA-256 for all files
      const filesInfo = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          fileSize: file.size,
          sha: await calculateSHA256(file),
        })),
      );

      // Call publish API with anonymous user ID
      const response = await fetch('/api/sites/publish-anon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesInfo,
          anonymousUserId, // Pass persistent browser ID
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create site');
      }

      const result: PublishResult = await response.json();

      // Upload all files to R2 using presigned URLs
      await Promise.all(
        result.files.map(async (fileInfo) => {
          const file = files.find((f) => f.name === fileInfo.fileName);
          if (!file) {
            throw new Error(`File not found: ${fileInfo.fileName}`);
          }

          const uploadResponse = await fetch(fileInfo.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': 'text/markdown',
            },
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload file: ${fileInfo.fileName}`);
          }
        }),
      );

      // Wait for processing to complete
      await waitForProcessing(result.siteId);

      // Track success with time to publish
      const timeToPublishMs = Date.now() - startTime;
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      trackPublishSuccess(result.siteId, totalSize, timeToPublishMs);

      // Track that user sees the claim prompt
      trackClaimPromptShown(result.siteId, 'modal');

      // Store the reusable ownership token (same token for all sites from this browser)
      const token = result.ownershipToken;
      setAnonymousToken(token);

      // Save site ID to localStorage
      saveSiteId(result.siteId);

      // Refetch sites to get the new one
      refetchSites();

      // Show success
      setLiveUrl(result.liveUrl);
      setSiteId(result.siteId);
      setState('published');
    } catch (err) {
      console.error('Publish error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to publish';
      trackPublishFailed(errorMessage);
      setError(errorMessage);
      setState('error');
    }
  };

  const handleCopyUrl = async () => {
    try {
      const fullUrl = `${window.location.origin}${liveUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);

      // Track URL copy
      trackUrlCopied(siteId);

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSaveSite = () => {
    trackClaimStarted(siteId, 'modal');
    router.push(`/claim?siteId=${siteId}`);
  };

  const handleVisitSite = () => {
    trackVisitSiteClicked(siteId);
  };

  const handlePublishAnother = () => {
    setState('idle');
    setShowPublishModal(false);
    setLiveUrl('');
    setSiteId('');
    setError('');
    setCopied(false);
  };

  const handleCloseModal = () => {
    // Only allow closing on published or error state
    if (state === 'published' || state === 'error') {
      setShowPublishModal(false);
    }
  };

  const handleClaimSite = (siteId: string) => {
    router.push(`/claim?siteId=${siteId}`);
  };

  return (
    <>
      {/* Hero Section */}
      <div className="bg-white">
        <div className="relative isolate pt-14">
          <div className="pt-12 sm:pt-16">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-6xl">
                  Drop markdown.
                  <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7EB75B] to-[#A8D48A]">
                    Get a website.
                  </span>
                </h1>
                <p className="mt-6 text-pretty text-md font-medium text-gray-800 sm:text-lg">
                  The fastest way to publish real content on the web. No account
                  needed. No setup. Just drag and drop.
                </p>
              </div>

              {/* Drop Zone - Primary interaction */}
              <div className="mt-8 sm:mt-12 max-w-3xl mx-auto">
                <DropZone onFileSelect={handleFileSelect} />
                <p className="text-center text-sm text-gray-400 mt-3">
                  Publishing a GitHub repo or many pages?{' '}
                  <a
                    href="https://cloud.flowershow.app/login"
                    className="hover:text-gray-700 underline"
                  >
                    Sign in →
                  </a>
                </p>
                <p className="text-center text-sm text-gray-400 mt-2">
                  No file handy?{' '}
                  <button
                    type="button"
                    onClick={async () => {
                      const response = await fetch(
                        'https://r2-assets.flowershow.app/README.md',
                      );
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'README.md';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="underline hover:text-gray-600"
                  >
                    Try an example
                  </button>
                </p>
              </div>

              {/* Social proof */}
              <p className="mt-8 text-sm text-gray-400 text-center">
                <span className="font-medium text-gray-600">990+</span> sites
                published &nbsp;&middot;&nbsp;{' '}
                <span className="font-medium text-gray-600">Free plan</span>{' '}
                <span className="text-gray-500">— forever.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Your Published Sites - only show if user has published sites */}
      {sites && sites.length > 0 && (
        <div className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              You recently published
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100 max-h-[250px] overflow-y-auto">
              {sites.map((site) => {
                const siteUrl = getSiteUrlPath(site);
                const isOwned = !site.isTemporary && !!site.user.id;

                return (
                  <div
                    key={site.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {site.projectName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatRelativeTime(site.createdAt.toISOString())}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {isOwned ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Owned
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimSite(site.id)}
                          className="text-sm text-[#7EB75B] hover:text-[#043406] hover:underline font-medium"
                        >
                          Claim
                        </button>
                      )}
                      <a
                        href={`${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${siteUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View
                      </a>
                      <button
                        onClick={async () => {
                          try {
                            const fullUrl = `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${siteUrl}`;
                            await navigator.clipboard.writeText(fullUrl);
                          } catch (err) {
                            console.error('Failed to copy URL:', err);
                          }
                        }}
                        className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                      >
                        Copy URL
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mx-auto py-8 sm:py-16 max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            Publish first. Explain later.
          </h2>
          <p className="mt-6 text-lg text-gray-600">
            Three steps. Under 60 seconds.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EBF5E7] ring-1 ring-[#C5DDB8]">
              <svg
                aria-hidden="true"
                className="h-8 w-8 text-[#7EB75B]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7.5A2.25 2.25 0 015.25 5.25H9l1.5 1.5h8.25A2.25 2.25 0 0121 9v7.5A2.25 2.25 0 0118.75 18.75H5.25A2.25 2.25 0 013 16.5V7.5z"
                />
              </svg>
            </div>
            <h3 className="mt-6 text-lg font-semibold text-gray-900">
              1. Drop your files
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Drag in your Markdown files. No sign-up. No config.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EBF5E7] ring-1 ring-[#C5DDB8]">
              <svg
                aria-hidden="true"
                className="h-8 w-8 text-[#7EB75B]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
            </div>
            <h3 className="mt-6 text-lg font-semibold text-gray-900">
              2. Get a live URL
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Your site is published instantly. Copy the link and share it.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EBF5E7] ring-1 ring-[#C5DDB8]">
              <svg
                aria-hidden="true"
                className="h-8 w-8 text-[#7EB75B]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                />
              </svg>
            </div>
            <h3 className="mt-6 text-lg font-semibold text-gray-900">
              3. Save it (if you want)
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Create an account later to keep your site, add a custom domain,
              and publish more.
            </p>
          </div>
        </div>
      </div>

      {/* Other publish methods */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
              Need more power?
            </h2>
            <p className="mt-6 text-lg text-gray-600">
              Drag and drop is the fastest start. When you&apos;re ready, pick a
              workflow that fits.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/blog/how-to-publish-repository-with-markdown"
              className="group flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/80 transition duration-200 hover:shadow-md hover:ring-[#B5D4A3]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBF5E7] ring-1 ring-[#C5DDB8]">
                <svg
                  aria-hidden="true"
                  className="h-6 w-6 text-[#7EB75B]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.48 2 2 6.48 2 12a10 10 0 006.84 9.49c.5.09.68-.22.68-.48
    0-.24-.01-.87-.01-1.71-2.78.6-3.37-1.34-3.37-1.34-.45-1.14-1.1-1.44-1.1-1.44
    -.9-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.88 1.5 2.31 1.07 2.87.82
    .09-.64.35-1.07.63-1.31-2.22-.25-4.56-1.11-4.56-4.95
    0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65
    0 0 .84-.27 2.75 1.02A9.56 9.56 0 0112 6.84c.85.004 1.7.115 2.5.337
    1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65
    .64.7 1.02 1.59 1.02 2.68 0 3.85-2.34 4.7-4.57 4.95
    .36.31.67.92.67 1.85 0 1.33-.01 2.4-.01 2.73
    0 .27.18.58.69.48A10 10 0 0022 12c0-5.52-4.48-10-10-10z"
                  />
                </svg>
              </div>
              <h3 className="mt-6 text-base font-semibold text-gray-900">
                Connect GitHub
              </h3>
              <p className="mt-2 text-sm text-gray-500 flex-1">
                Keep content in your repo.
                <br />
                Push changes — they auto-sync.
              </p>
              <span className="mt-5 text-sm font-medium text-[#7EB75B]">
                Get started →
              </span>
            </a>
            <a
              href="/uses/obsidian"
              className="group flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/80 transition duration-200 hover:shadow-md hover:ring-[#B5D4A3]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBF5E7] ring-1 ring-[#C5DDB8]">
                <svg
                  className="h-6 w-6 text-[#7EB75B]"
                  aria-hidden="true"
                  role="img"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="none"
                  fill="currentColor"
                >
                  <path d="M19.355 18.538a68.967 68.959 0 0 0 1.858-2.954.81.81 0 0 0-.062-.9c-.516-.685-1.504-2.075-2.042-3.362-.553-1.321-.636-3.375-.64-4.377a1.707 1.707 0 0 0-.358-1.05l-3.198-4.064a3.744 3.744 0 0 1-.076.543c-.106.503-.307 1.004-.536 1.5-.134.29-.29.6-.446.914l-.31.626c-.516 1.068-.997 2.227-1.132 3.59-.124 1.26.046 2.73.815 4.481.128.011.257.025.386.044a6.363 6.363 0 0 1 3.326 1.505c.916.79 1.744 1.922 2.415 3.5zM8.199 22.569c.073.012.146.02.22.02.78.024 2.095.092 3.16.29.87.16 2.593.64 4.01 1.055 1.083.316 2.198-.548 2.355-1.664.114-.814.33-1.735.725-2.58l-.01.005c-.67-1.87-1.522-3.078-2.416-3.849a5.295 5.295 0 0 0-2.778-1.257c-1.54-.216-2.952.19-3.84.45.532 2.218.368 4.829-1.425 7.531zM5.533 9.938c-.023.1-.056.197-.098.29L2.82 16.059a1.602 1.602 0 0 0 .313 1.772l4.116 4.24c2.103-3.101 1.796-6.02.836-8.3-.728-1.73-1.832-3.081-2.55-3.831zM9.32 14.01c.615-.183 1.606-.465 2.745-.534-.683-1.725-.848-3.233-.716-4.577.154-1.552.7-2.847 1.235-3.95.113-.235.223-.454.328-.664.149-.297.288-.577.419-.86.217-.47.379-.885.46-1.27.08-.38.08-.72-.014-1.043-.095-.325-.297-.675-.68-1.06a1.6 1.6 0 0 0-1.475.36l-4.95 4.452a1.602 1.602 0 0 0-.513.952l-.427 2.83c.672.59 2.328 2.316 3.335 4.711.09.21.175.43.253.653z" />
                </svg>
              </div>
              <h3 className="mt-6 text-base font-semibold text-gray-900">
                Publish from Obsidian
              </h3>
              <p className="mt-2 text-sm text-gray-500 flex-1">
                Keep writing in your vault. Publish with our official Obsidian
                plugin.
              </p>
              <span className="mt-5 text-sm font-medium text-[#7EB75B]">
                Get started →
              </span>
            </a>
            <a
              href="/publish"
              className="group flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/80 transition duration-200 hover:shadow-md hover:ring-[#B5D4A3]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBF5E7] ring-1 ring-[#C5DDB8]">
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-[#7EB75B]"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M12 19h8" />
                  <path d="m4 17 6-6-6-6" />
                </svg>
              </div>
              <h3 className="mt-6 text-base font-semibold text-gray-900">
                Use the CLI
              </h3>
              <p className="mt-2 text-sm text-gray-500 flex-1">
                Publish from the terminal. Script it if you want.
              </p>
              <span className="mt-5 text-sm font-medium text-[#7EB75B]">
                Get started →
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Features - bento grid */}
      <div className="bg-gray-50 py-6 mt-6 sm:mt-12 sm:py-12">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
          <h2 className="mt-2 max-w-5xl text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            A real website, not a preview.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6">
            <div className="flex p-px lg:col-span-3">
              <div className="flex flex-col w-full overflow-hidden rounded-lg bg-white outline outline-1 outline-black/5 max-lg:rounded-t-[2rem] lg:rounded-tl-[2rem]">
                <div className="p-10">
                  <h3 className="mt-2 text-lg font-medium tracking-tight text-gray-900">
                    No account required
                  </h3>
                  <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                    Publish immediately. Your site gets a temporary URL that
                    works for 7 days. No sign-up, no credit card, no friction.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex p-px lg:col-span-3">
              <div className="flex flex-col w-full overflow-hidden rounded-lg bg-white outline outline-1 outline-black/5 lg:rounded-tr-[2rem]">
                <div className="p-10">
                  <h3 className="mt-2 text-lg font-medium tracking-tight text-gray-900">
                    Shareable in seconds
                  </h3>
                  <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                    Get a live, public URL the moment your files are uploaded.
                    Share drafts, landing pages, or docs with anyone instantly.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex p-px lg:col-span-2">
              <div className="flex flex-col w-full overflow-hidden rounded-lg bg-white outline outline-1 outline-black/5">
                <div className="p-10">
                  <h3 className="mt-2 text-lg font-medium tracking-tight text-gray-900">
                    Temporary by default
                  </h3>
                  <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                    Disposable URLs are a feature, not a limitation. Perfect for
                    work-in-progress content you need to share fast.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex p-px lg:col-span-2">
              <div className="flex flex-col w-full overflow-hidden rounded-lg bg-white outline outline-1 outline-black/5">
                <div className="p-10">
                  <h3 className="mt-2 text-lg font-medium tracking-tight text-gray-900">
                    Save when you&apos;re ready
                  </h3>
                  <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                    Want to keep it? Create a free account to save your site,
                    manage multiple sites, and add a custom domain.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex p-px lg:col-span-2">
              <div className="flex flex-col w-full overflow-hidden rounded-lg bg-white outline outline-1 outline-black/5 max-lg:rounded-b-[2rem] lg:rounded-br-[2rem]">
                <div className="p-10">
                  <h3 className="mt-2 text-lg font-medium tracking-tight text-gray-900">
                    Plain Markdown
                  </h3>
                  <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                    Your files are never locked in. Take them anywhere — another
                    host, another tool, or your own infrastructure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Use cases */}
      <div className="bg-white py-8 sm:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
              What will you publish?
            </h2>
            <p className="mt-6 text-lg text-gray-600">
              Blogs, docs, landing pages, knowledge bases — if it&apos;s
              Markdown, it works.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/uses/blogs"
              className="group flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/80 transition duration-200 hover:shadow-md hover:ring-[#B5D4A3]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBF5E7] ring-1 ring-[#C5DDB8]">
                <svg
                  aria-hidden="true"
                  className="h-6 w-6 text-[#7EB75B]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
                  />
                </svg>
              </div>
              <h3 className="mt-6 text-base font-semibold text-gray-900">
                Blogs
              </h3>
              <p className="mt-2 text-sm text-gray-500 flex-1">
                Drop your writing in a folder. That&apos;s your blog.
              </p>
              <span className="mt-5 text-sm font-medium text-[#7EB75B]">
                Learn more →
              </span>
            </a>
            <a
              href="/uses/docs"
              className="group flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/80 transition duration-200 hover:shadow-md hover:ring-[#B5D4A3]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBF5E7] ring-1 ring-[#C5DDB8]">
                <svg
                  aria-hidden="true"
                  className="h-6 w-6 text-[#7EB75B]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
              <h3 className="mt-6 text-base font-semibold text-gray-900">
                Documentation
              </h3>
              <p className="mt-2 text-sm text-gray-500 flex-1">
                Your folders become sections. Your files become pages.
              </p>
              <span className="mt-5 text-sm font-medium text-[#7EB75B]">
                Learn more →
              </span>
            </a>
            {/* <a
              href="/uses/landing-pages"
              className="group flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/80 transition duration-200 hover:shadow-md hover:ring-[#B5D4A3]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBF5E7] ring-1 ring-[#C5DDB8]">
                <svg
                  aria-hidden="true"
                  className="h-6 w-6 text-[#7EB75B]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
              </div>
              <h3 className="mt-6 text-base font-semibold text-gray-900">
                Landing pages
              </h3>
              <p className="mt-2 text-sm text-gray-500 flex-1">
                Share a draft or idea fast. Get a URL in under a minute.
              </p>
              <span className="mt-5 text-sm font-medium text-[#7EB75B]">
                Learn more →
              </span>
            </a> */}
            <a
              href="/uses/data-stories"
              className="group flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/80 transition duration-200 hover:shadow-md hover:ring-[#B5D4A3]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBF5E7] ring-1 ring-[#C5DDB8]">
                <svg
                  aria-hidden="true"
                  className="h-6 w-6 text-[#7EB75B]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              </div>
              <h3 className="mt-6 text-base font-semibold text-gray-900">
                Data stories
              </h3>
              <p className="mt-2 text-sm text-gray-500 flex-1">
                Tables, charts, and interactive data — from CSV files.
              </p>
              <span className="mt-5 text-sm font-medium text-[#7EB75B]">
                Learn more →
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 sm:py-16 lg:px-8">
          <h2 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            Frequently asked questions
          </h2>
          <dl className="mt-20 divide-y divide-gray-900/10">
            <div className="py-8 first:pt-0 last:pb-0 lg:grid lg:grid-cols-12 lg:gap-8">
              <dt className="text-base/7 font-semibold text-gray-900 lg:col-span-5">
                Do I need an account to publish?
              </dt>
              <dd className="mt-4 lg:col-span-7 lg:mt-0">
                <p className="text-base/7 text-gray-600">
                  No. Drop your files and get a live URL instantly. Your site is
                  temporary (7 days) unless you create an account to save it.
                </p>
              </dd>
            </div>
            <div className="py-8 first:pt-0 last:pb-0 lg:grid lg:grid-cols-12 lg:gap-8">
              <dt className="text-base/7 font-semibold text-gray-900 lg:col-span-5">
                What happens when a temporary site expires?
              </dt>
              <dd className="mt-4 lg:col-span-7 lg:mt-0">
                <p className="text-base/7 text-gray-600">
                  It expires silently after 7 days. You can restore it any time
                  by creating an account. Or just publish again — it takes
                  seconds.
                </p>
              </dd>
            </div>
            <div className="py-8 first:pt-0 last:pb-0 lg:grid lg:grid-cols-12 lg:gap-8">
              <dt className="text-base/7 font-semibold text-gray-900 lg:col-span-5">
                What file formats are supported?
              </dt>
              <dd className="mt-4 lg:col-span-7 lg:mt-0">
                <p className="text-base/7 text-gray-600">
                  Markdown (.md) and MDX (.mdx) files, plus images and assets.
                  Up to 5 files without an account.
                </p>
              </dd>
            </div>
            <div className="py-8 first:pt-0 last:pb-0 lg:grid lg:grid-cols-12 lg:gap-8">
              <dt className="text-base/7 font-semibold text-gray-900 lg:col-span-5">
                Is there a free plan?
              </dt>
              <dd className="mt-4 lg:col-span-7 lg:mt-0">
                <p className="text-base/7 text-gray-600">
                  Yes — forever. Free accounts get saved sites with basic
                  permanence. Premium adds custom domains, multiple sites, and
                  more.
                </p>
              </dd>
            </div>
            <div className="py-8 first:pt-0 last:pb-0 lg:grid lg:grid-cols-12 lg:gap-8">
              <dt className="text-base/7 font-semibold text-gray-900 lg:col-span-5">
                Can I use my own domain?
              </dt>
              <dd className="mt-4 lg:col-span-7 lg:mt-0">
                <p className="text-base/7 text-gray-600">
                  Yes, on the paid plan. Create an account, save your site, and
                  add a custom domain from the dashboard.
                </p>
              </dd>
            </div>
            <div className="py-8 first:pt-0 last:pb-0 lg:grid lg:grid-cols-12 lg:gap-8">
              <dt className="text-base/7 font-semibold text-gray-900 lg:col-span-5">
                What if I want to move my content later?
              </dt>
              <dd className="mt-4 lg:col-span-7 lg:mt-0">
                <p className="text-base/7 text-gray-600">
                  Your content is plain Markdown. Take it anywhere — another
                  host, another tool, or your own infrastructure. No lock-in.
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-[#043406]">
        <div className="px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Publish a real website in under 60 seconds.
            </h2>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-[#7EB75B] shadow-sm hover:bg-[#EBF5E7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Try it now →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Modal */}
      <Modal
        showModal={showPublishModal}
        setShowModal={setShowPublishModal}
        closeOnClickOutside={state !== 'uploading'}
      >
        <PublishModal
          state={state as 'uploading' | 'published' | 'error'}
          liveUrl={liveUrl}
          error={error}
          copied={copied}
          onCopyUrl={handleCopyUrl}
          onSaveSite={handleSaveSite}
          onVisitSite={handleVisitSite}
          onPublishAnother={handlePublishAnother}
          onClose={handleCloseModal}
        />
      </Modal>
    </>
  );
}

/**
 * Wait for site processing to complete
 */
async function waitForProcessing(siteId: string): Promise<void> {
  const maxAttempts = 60; // 60 seconds max
  const pollInterval = 1000; // 1 second

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`/api/sites/id/${siteId}/status`);

    if (!response.ok) {
      throw new Error('Failed to check processing status');
    }

    const status = await response.json();

    if (status.status === 'complete') {
      return; // Processing complete
    }

    if (status.status === 'error') {
      const errorMessage = status.errors?.[0]?.error || 'Processing failed';
      throw new Error(errorMessage);
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Processing timeout - please refresh to check your site');
}

/**
 * Calculate SHA-256 hash of a file
 * Falls back to a simple hash in non-secure contexts (HTTP development)
 */
async function calculateSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  // crypto.subtle requires HTTPS - use fallback for HTTP development
  if (typeof crypto.subtle?.digest === 'function') {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Simple fallback hash for non-secure contexts (dev only)
  const bytes = new Uint8Array(buffer);
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i]!;
    hash = (hash * 0x01000193) >>> 0; // FNV prime, keep as 32-bit
  }
  return (
    hash.toString(16).padStart(8, '0') +
    file.size.toString(16).padStart(16, '0')
  );
}

function trackPublishSuccess(
  siteId: string,
  fileSize: number,
  timeToPublishMs: number,
) {
  posthog.capture('anon_publish_succeeded', {
    site_id: siteId,
    file_size: fileSize,
    time_to_publish_ms: timeToPublishMs,
  });
}

function trackPublishFailed(errorMessage: string) {
  posthog.capture('anon_publish_failed', {
    error_message: errorMessage,
  });
}

function trackUrlCopied(siteId: string) {
  posthog.capture('anon_url_copied', {
    site_id: siteId,
  });
}

function trackClaimPromptShown(siteId: string, trigger: 'modal' | 'banner') {
  posthog.capture('anon_claim_prompt_shown', {
    site_id: siteId,
    trigger,
  });
}

function trackClaimStarted(siteId: string, trigger: 'modal' | 'banner') {
  posthog.capture('anon_claim_started', {
    site_id: siteId,
    trigger,
  });
}

function trackVisitSiteClicked(siteId: string) {
  posthog.capture('anon_visit_site_clicked', {
    site_id: siteId,
  });
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'just now';
  }
  if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString();
}
