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
      {/* Hero Section - Minimal, activation-focused */}
      <div className="min-h-[95vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Markdown to website in seconds
            </h1>
            <p className="text-lg sm:text-xl text-gray-600">
              Fastest way to turn markdown into a website — from blogs to docs,
              landing pages to knowledgebases. For geeks who value their time.
              <sup title="Yes, we know you could code your own site in NextJS, Hugo or whatever. (We did that too). But is that *really* the best use of your time? (OK, OK, if you deploy your apps to baremetal and roll your own Linux, then go for it!) But otherwise give us a try.">
                *
              </sup>
            </p>
          </div>

          {/* Drop Zone - Primary interaction */}
          <div className="mb-8">
            <DropZone onFileSelect={handleFileSelect} />
            <p className="text-center text-sm text-gray-400 mt-3">
              Publishing more than 5 files or a GitHub repo?{' '}
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
          <SocialProof />
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
                          className="text-sm text-orange-600 hover:text-orange-800 hover:underline font-medium"
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

      {/* Spacer to push below-fold content down */}
      <div className="h-12"></div>

      {/* What is Flowershow Section - Below the fold */}
      <div className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl lg:text-center">
            <h2 className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl lg:text-balance">
              What is Flowershow?
            </h2>
            <p className="mt-6 text-lg/8 text-gray-600">
              Flowershow is a quick and easy way to turn your markdown into an
              elegant website. No coding, no technical setup, no maintenance
              required. Just connect your content and publish with a click.
              Perfect for markdown-based docs, blogs, knowledgebases, landing
              pages and more.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-3xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-16">
              <div>
                <dt className="font-semibold text-gray-900">
                  ⚡️ Instant deployment
                </dt>
                <dd className="mt-2 text-gray-600">
                  Publish your site in seconds with zero configuration—no coding
                  or setup required.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">
                  🗂️ Folder-based publishing
                </dt>
                <dd className="mt-2 text-gray-600">
                  Turn any folder of Markdown files into a structured,
                  multi-page website automatically.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">
                  📠 Markdown-based
                </dt>
                <dd className="mt-2 text-gray-600">
                  Compatible with CommonMark, GitHub Flavored Markdown,
                  Obsidian-style Wiki links, and more.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">
                  ☁️ Hosted for you
                </dt>
                <dd className="mt-2 text-gray-600">
                  Get a clean, beautiful site out of the box—no need for custom
                  design or build tools.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">
                  🔓 Own your content
                </dt>
                <dd className="mt-2 text-gray-600">
                  Fully Markdown-native and Git-integrable—no platform lock-in.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">
                  🖌️ Custom domains and themes
                </dt>
                <dd className="mt-2 text-gray-600">
                  Use your own domain and personalize the look of your site with
                  custom CSS and Tailwind classes.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Features Sections */}
      <div className="overflow-hidden py-12 sm:py-16 bg-gray-50">
        <div className="mx-auto max-w-8xl md:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:grid-cols-2 lg:items-start">
            <div className="px-6 md:px-0 lg:pr-4 lg:pt-4">
              <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-lg">
                <h2 className="text-base/7 font-semibold text-orange-600">
                  Syntax
                </h2>
                <p className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                  Rich Markdown Syntax Support
                </p>
                <p className="mt-6 text-lg/8 text-gray-700">
                  From basic CommonMark to advanced GitHub Flavoured Markdown
                  and Obsidian Wiki links, we&apos;ve got you covered. Enhance
                  your content with Mermaid diagrams for clear visualizations
                  and LaTeX for beautiful mathematical equations.
                </p>
              </div>
            </div>
            <div className="sm:px-6 lg:px-0">
              <div className="relative isolate overflow-hidden bg-orange-500 px-6 pt-8 sm:mx-auto sm:max-w-2xl sm:rounded-3xl sm:pl-12 sm:pr-0 sm:pt-12 lg:mx-0 lg:max-w-none">
                <div
                  aria-hidden="true"
                  className="absolute -inset-y-px -left-3 -z-10 w-full origin-bottom-left skew-x-[-30deg] bg-orange-100 opacity-20 ring-1 ring-inset ring-white"
                ></div>
                <div className="mx-auto max-w-2xl sm:mx-0 sm:max-w-none">
                  <div className="overflow-hidden -mb-2 -mr-4 rounded-tl-xl rounded-tr-xl bg-gray-900 ring-1 ring-white/10">
                    <img
                      alt="Markdown syntax support"
                      src="/assets/syntax-support.png"
                      className="w-full"
                    />
                  </div>
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10 sm:rounded-3xl"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden py-12 sm:py-16">
        <div className="mx-auto max-w-8xl md:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:grid-cols-2 lg:items-start">
            <div className="px-6 md:px-0 lg:pr-4 lg:pt-4">
              <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-lg">
                <h2 className="text-base/7 font-semibold text-orange-600">
                  Layout
                </h2>
                <p className="mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                  Elegant page layout
                </p>
                <p className="mt-6 text-lg/8 text-gray-700">
                  Flowershow layout include elegant page headers, table of
                  contents and an optional sidebar with your site-tree.
                </p>
              </div>
            </div>
            <div className="sm:px-6 lg:px-0">
              <div className="relative isolate overflow-hidden bg-orange-500 px-6 pt-8 sm:mx-auto sm:max-w-2xl sm:rounded-3xl sm:pl-12 sm:pr-0 sm:pt-12 lg:mx-0 lg:max-w-none">
                <div
                  aria-hidden="true"
                  className="absolute -inset-y-px -left-3 -z-10 w-full origin-bottom-left skew-x-[-30deg] bg-orange-100 opacity-20 ring-1 ring-inset ring-white"
                ></div>
                <div className="mx-auto max-w-2xl sm:mx-0 sm:max-w-none">
                  <div className="overflow-hidden -mb-2 -mr-4 rounded-tl-xl rounded-tr-xl bg-gray-900 ring-1 ring-white/10">
                    <img
                      alt="Page layout"
                      src="/assets/blog-header.png"
                      className="w-full"
                    />
                  </div>
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10 sm:rounded-3xl"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden py-12 sm:py-16 bg-gray-50">
        <div className="mx-auto max-w-8xl md:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:grid-cols-2 lg:items-start">
            <div className="px-6 md:px-0 lg:pr-4 lg:pt-4">
              <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-lg">
                <h2 className="text-base/7 font-semibold text-orange-600">
                  Themes
                </h2>
                <p className="mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                  Customizable theme
                </p>
                <p className="mt-6 text-lg/8 text-gray-700">
                  Use one of the Flowershow official themes or customize your
                  site yourself with CSS. You can also use JSX blocks and style
                  them with Tailwind!
                </p>
              </div>
            </div>
            <div className="sm:px-6 lg:px-0">
              <div className="relative isolate overflow-hidden bg-orange-500 px-6 pt-8 sm:mx-auto sm:max-w-2xl sm:rounded-3xl sm:pl-12 sm:pr-0 sm:pt-12 lg:mx-0 lg:max-w-none">
                <div
                  aria-hidden="true"
                  className="absolute -inset-y-px -left-3 -z-10 w-full origin-bottom-left skew-x-[-30deg] bg-orange-100 opacity-20 ring-1 ring-inset ring-white"
                ></div>
                <div className="mx-auto max-w-2xl sm:mx-0 sm:max-w-none">
                  <div className="overflow-hidden -mb-2 -mr-4 rounded-tl-xl rounded-tr-xl bg-gray-900 ring-1 ring-white/10">
                    <img
                      alt="Customizable themes"
                      src="/assets/official-themes.png"
                      className="w-full"
                    />
                  </div>
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10 sm:rounded-3xl"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Community Sites */}
      <div className="py-12 sm:py-24 my-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="my-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl lg:text-balance lg:text-center">
            Community sites
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-3">
            <div>
              <a href="https://my.flowershow.app/@ASingleMind/Verdantverse">
                <img
                  alt="Verdantverse"
                  src="/assets/showcases/verdantverse.png"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                />
                <div className="mt-4 text-lg font-medium text-gray-900">
                  <h3>Verdantverse</h3>
                </div>
              </a>
            </div>
            <div>
              <a href="https://backtobasic.dev/">
                <img
                  alt="Back to Basic"
                  src="/assets/showcases/backtobasic.png"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                />
                <div className="mt-4 text-lg font-medium text-gray-900">
                  <h3>Back to Basic</h3>
                </div>
              </a>
            </div>
            <div>
              <a href="https://givewiser.org/">
                <img
                  alt="Give Wiser"
                  src="/assets/showcases/give-wiser.png"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                />
                <div className="mt-4 text-lg font-medium text-gray-900">
                  <h3>Give Wiser</h3>
                </div>
              </a>
            </div>
            <div>
              <a href="https://my.flowershow.app/@Iwuaa/dnd-compendium">
                <img
                  alt="D&D Compendium"
                  src="/assets/showcases/dnd.png"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                />
                <div className="mt-4 text-lg font-medium text-gray-900">
                  <h3>D&D Compendium</h3>
                </div>
              </a>
            </div>
            <div>
              <a href="https://my.flowershow.app/@CCCCOOH/Note">
                <img
                  alt="Sy_Study&Note"
                  src="/assets/showcases/ccccooh.png"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                />
                <div className="mt-4 text-lg font-medium text-gray-900">
                  <h3>Sy_Study&Note</h3>
                </div>
              </a>
            </div>
            <div>
              <a href="https://developmentalspaces.org/">
                <img
                  alt="Developmental Spaces"
                  src="/assets/showcases/developmentalspaces.png"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                />
                <div className="mt-4 text-lg font-medium text-gray-900">
                  <h3>Developmental Spaces</h3>
                </div>
              </a>
            </div>
            <div>
              <a href="https://metacrisis.info/">
                <img
                  alt="Metacrisis"
                  src="/assets/showcases/metacrisis.png"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                />
                <div className="mt-4 text-lg font-medium text-gray-900">
                  <h3>Metacrisis</h3>
                </div>
              </a>
            </div>
            <div>
              <a href="https://my.flowershow.app/@bluedogXLII/hexxen-herr-der-fliegen">
                <img
                  alt="Hexxen 1733"
                  src="/assets/showcases/hexxen.png"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                />
                <div className="mt-4 text-lg font-medium text-gray-900">
                  <h3>Hexxen 1733</h3>
                </div>
              </a>
            </div>
            <div>
              <a href="https://rufuspollock.com/">
                <img
                  alt="Rufus Pollock"
                  src="/assets/showcases/rufuspollockcom.png"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                />
                <div className="mt-4 text-lg font-medium text-gray-900">
                  <h3>Rufus Pollock</h3>
                </div>
              </a>
            </div>
            <div>
              <a href="https://research.lifeitself.org/">
                <img
                  alt="LifeItself Research"
                  src="/assets/showcases/life-itself-research.png"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                />
                <div className="mt-4 text-lg font-medium text-gray-900">
                  <h3>Life Itself Research</h3>
                </div>
              </a>
            </div>
            <div>
              <a href="https://comparethe.co/">
                <img
                  alt="CompareThe＿"
                  src="/assets/showcases/comparethe.png"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                />
                <div className="mt-4 text-lg font-medium text-gray-900">
                  <h3>CompareThe＿</h3>
                </div>
              </a>
            </div>
            <div>
              <a href="https://my.flowershow.app/@je7remy/linuxknowledge">
                <img
                  alt="Linux & Cybersecurity Knowledge Hub"
                  src="/assets/showcases/jeremy-linux-knowledge.png"
                  className="aspect-video w-full rounded-lg bg-gray-100 object-cover"
                />
                <div className="mt-4 text-lg font-medium text-gray-900">
                  <h3>Linux & Cybersecurity Knowledge Hub</h3>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-900 mt-16">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Start using Flowershow today.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg/8 text-slate-100">
              Publish an elegant markdown-based website in a breeze.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow hover:bg-slate-200"
              >
                Try it now
              </a>
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

/**
 * Track publish success event
 */
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

/**
 * Track publish failure event
 */
function trackPublishFailed(errorMessage: string) {
  posthog.capture('anon_publish_failed', {
    error_message: errorMessage,
  });
}

/**
 * Track URL copied event
 */
function trackUrlCopied(siteId: string) {
  posthog.capture('anon_url_copied', {
    site_id: siteId,
  });
}

/**
 * Track claim prompt shown event
 */
function trackClaimPromptShown(siteId: string, trigger: 'modal' | 'banner') {
  posthog.capture('anon_claim_prompt_shown', {
    site_id: siteId,
    trigger,
  });
}

/**
 * Track claim started event
 */
function trackClaimStarted(siteId: string, trigger: 'modal' | 'banner') {
  posthog.capture('anon_claim_started', {
    site_id: siteId,
    trigger,
  });
}

/**
 * Track visit site clicked event
 */
function trackVisitSiteClicked(siteId: string) {
  posthog.capture('anon_visit_site_clicked', {
    site_id: siteId,
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function SocialProof() {
  const { data: stats } = api.user.getStats.useQuery();

  if (!stats) {
    return null;
  }

  const displayCount =
    stats.userCount >= 1000
      ? `${Math.floor(stats.userCount / 100) * 100}+`
      : `${stats.userCount}+`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm mb-6">
      {stats.recentUsers.length > 0 && (
        <div className="flex -space-x-2">
          {stats.recentUsers.map((user) => (
            <img
              key={user.id}
              className="w-8 h-8 rounded-full border-2 border-white"
              src={user.image!}
              alt="user"
            />
          ))}
        </div>
      )}
      <p className="text-slate-500 font-medium">
        Join{' '}
        <span className="text-slate-900 font-bold">{displayCount} users</span>{' '}
        already publishing with Flowershow.
      </p>
    </div>
  );
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
