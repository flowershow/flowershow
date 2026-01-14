'use client';

import { useState, useEffect } from 'react';
import { DropZone } from '@/components/publish/drop-zone';
import { PublishingState } from '@/components/publish/publishing-state';

type State = 'idle' | 'uploading' | 'published' | 'error';

interface PublishResult {
  siteId: string;
  projectName: string;
  liveUrl: string;
}

interface PublishedSite {
  siteId: string;
  projectName: string;
  liveUrl: string;
  publishedAt: string;
  fileName?: string;
}

const MAX_STORED_SITES = 10;
const STORAGE_KEY = 'flowershow_published_sites';

export default function HomePage() {
  const [state, setState] = useState<State>('idle');
  const [liveUrl, setLiveUrl] = useState<string>('');
  const [siteId, setSiteId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [publishedSites, setPublishedSites] = useState<PublishedSite[]>([]);

  // Load published sites from localStorage on mount
  useEffect(() => {
    loadPublishedSites();
  }, []);

  const loadPublishedSites = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const sites = JSON.parse(stored) as PublishedSite[];
        setPublishedSites(sites);
      }
    } catch (err) {
      console.error('Failed to load published sites:', err);
    }
  };

  const savePublishedSite = (site: PublishedSite) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const sites = stored ? (JSON.parse(stored) as PublishedSite[]) : [];

      // Add new site at the beginning
      const updatedSites = [site, ...sites];

      // Keep only the last MAX_STORED_SITES
      const trimmedSites = updatedSites.slice(0, MAX_STORED_SITES);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedSites));
      setPublishedSites(trimmedSites);
    } catch (err) {
      console.error('Failed to save published site:', err);
    }
  };

  const handleFileSelect = async (file: File) => {
    setState('uploading');
    setError('');

    try {
      // Calculate SHA-256
      const sha = await calculateSHA256(file);
      const extension = file.name.split('.').pop();

      // Call publish API
      const response = await fetch('/api/publish-anon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `README.${extension}`, // always publish as README
          fileSize: file.size,
          sha,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create site');
      }

      const result: PublishResult & { uploadUrl: string } =
        await response.json();

      // Upload file to R2 using presigned URL
      const uploadResponse = await fetch(result.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'text/markdown',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Wait for processing to complete
      await waitForProcessing(result.siteId);

      // Track success
      trackPublishSuccess(result.siteId, file.size);

      // Save to localStorage
      savePublishedSite({
        siteId: result.siteId,
        projectName: result.projectName,
        liveUrl: result.liveUrl,
        publishedAt: new Date().toISOString(),
        fileName: file.name,
      });

      // Show success
      setLiveUrl(result.liveUrl);
      setSiteId(result.siteId);
      setState('published');
    } catch (err) {
      console.error('Publish error:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish');
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

  const handlePublishAnother = () => {
    setState('idle');
    setLiveUrl('');
    setSiteId('');
    setError('');
    setCopied(false);
  };

  if (state === 'uploading') {
    return <PublishingState />;
  }

  if (state === 'published') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="inline-block">
              <div className="text-6xl mb-4">🎉</div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Your site is live!
            </h1>
            <p className="text-gray-600">Share this URL with anyone</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <code className="flex-1 text-left bg-gray-100 px-4 py-3 rounded text-sm break-all">
                {window.location.origin}
                {liveUrl}
              </code>
              <button
                onClick={handleCopyUrl}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
              >
                {copied ? '✓ Copied!' : 'Copy URL'}
              </button>
            </div>

            <div className="flex gap-4 justify-center">
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                View your site →
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handlePublishAnother}
              className="text-gray-600 hover:text-gray-900 underline"
            >
              Publish another file
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Publishing Failed
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handlePublishAnother}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-12">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            Drop Markdown, Get Website
          </h1>
          <p className="text-xl text-gray-600">
            No account needed. No setup. Just drop a file.
          </p>
        </div>

        <DropZone onFileSelect={handleFileSelect} />

        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-gray-500">
            Supports .md and .mdx files up to 100MB
          </p>
        </div>

        {publishedSites.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Your Recently Published Sites
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              These are stored locally in your browser
            </p>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="divide-y divide-gray-200">
                {publishedSites.map((site) => (
                  <div
                    key={site.siteId}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {site.fileName || site.projectName}
                          </h3>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatRelativeTime(site.publishedAt)}
                          </span>
                        </div>
                        <a
                          href={site.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 hover:underline truncate block"
                        >
                          {window.location.origin}
                          {site.liveUrl}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={site.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                          View Site
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Wait for site processing to complete
 */
async function waitForProcessing(siteId: string): Promise<void> {
  const maxAttempts = 60; // 60 seconds max
  const pollInterval = 1000; // 1 second

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`/api/site/status/${siteId}`);

    if (!response.ok) {
      throw new Error('Failed to check processing status');
    }

    const status = await response.json();

    if (status.ready) {
      return; // Processing complete
    }

    if (status.status === 'error') {
      throw new Error(status.error || 'Processing failed');
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Processing timeout - please refresh to check your site');
}

/**
 * Calculate SHA-256 hash of a file
 */
async function calculateSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Track publish success event
 */
function trackPublishSuccess(siteId: string, fileSize: number) {
  // Track with PostHog
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('publish_succeeded', {
      site_id: siteId,
      file_size: fileSize,
      publish_type: 'anonymous',
    });
  }
}

/**
 * Track URL copied event
 */
function trackUrlCopied(siteId: string) {
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('url_copied', {
      site_id: siteId,
    });
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
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
