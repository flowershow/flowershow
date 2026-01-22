'use client';

import { XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { env } from '@/env.mjs';
import { getAnonymousUserId } from '@/lib/client-anonymous-user';

const isSecure =
  env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
const protocol = isSecure ? 'https' : 'http';

interface TemporarySiteBannerProps {
  siteId: string;
  expiresAt: Date | null;
  anonymousOwnerId: string | null;
}

function formatTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) return 'expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

export function TemporarySiteBanner({
  siteId,
  expiresAt,
  anonymousOwnerId,
}: TemporarySiteBannerProps) {
  const [isOwner, setIsOwner] = useState(false);
  // const [isDismissed, setIsDismissed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    // Check if current visitor is the owner
    if (!anonymousOwnerId) return;

    const visitorId = getAnonymousUserId();
    if (visitorId === anonymousOwnerId) {
      setIsOwner(true);
    }

    // Check if already dismissed this session
    // const dismissedKey = `temp-banner-dismissed-${siteId}`;
    // if (sessionStorage.getItem(dismissedKey)) {
    //   setIsDismissed(true);
    // }
  }, [anonymousOwnerId, siteId]);

  useEffect(() => {
    if (!expiresAt || !isOwner) return;

    // Update time remaining every minute
    const updateTime = () => {
      setTimeRemaining(formatTimeRemaining(new Date(expiresAt)));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [expiresAt, isOwner]);

  // const handleDismiss = () => {
  //   setIsDismissed(true);
  //   sessionStorage.setItem(`temp-banner-dismissed-${siteId}`, "true");
  // };

  const claimUrl = `${protocol}://${env.NEXT_PUBLIC_HOME_DOMAIN}/claim?siteId=${siteId}`;

  // if (!isOwner || isDismissed || !anonymousOwnerId) {
  if (!isOwner || !anonymousOwnerId) {
    return null;
  }

  return (
    <div className="font-heading text-sm text-white relative flex justify-center items-center bg-gray-900 px-6 py-2.5 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10 sm:px-3.5 dark:bg-gray-800">
      <p className="flex items-center gap-x-2 flex-wrap justify-center">
        <span className="font-medium">Temporary Site</span>
        <span className="text-gray-300">•</span>
        <span>
          Expires in <span className="font-semibold">{timeRemaining}</span>
        </span>
        <span className="text-gray-300">•</span>
        <a
          href={claimUrl}
          className="inline-flex items-center font-medium text-white whitespace-nowrap hover:underline"
        >
          Claim this site →
        </a>
      </p>
      {/* <div className="flex flex-1 justify-end">
        <button
          type="button"
          className="-m-3 p-3 focus-visible:-outline-offset-4"
        >
          <span className="sr-only">Dismiss</span>
          <XIcon aria-hidden="true" className="size-5 text-white" />
        </button>
      </div> */}
    </div>
  );
}
