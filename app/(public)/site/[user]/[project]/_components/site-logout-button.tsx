'use client';

import { LogOutIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SiteAuthButton({
  siteId,
  sitename,
}: {
  siteId: string;
  sitename: string;
}) {
  const router = useRouter();

  const handleSignOutFromSite = async () => {
    await fetch(`/api/sites/id/${siteId}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOutFromSite}
      type="button"
      className="visitor-logout-button"
      title={`Sign out from ${sitename}`}
    >
      <LogOutIcon aria-hidden="true" className="visitor-logout-button-icon" />
    </button>
  );
}
