'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { name: 'Name', href: '#projectName' },
  { name: 'Root Directory', href: '#rootDir', requiresGhRepository: true },
  { name: 'Markdown or MDX', href: '#syntaxMode' },
  { name: 'Auto-Sync', href: '#autoSync', requiresGhRepository: true },
  { name: 'Comments', href: '#enableComments' },
  { name: 'Custom Domain', href: '#customDomain' },
  { name: 'Full-Text Search', href: '#enableSearch' },
  { name: 'Password Protection', href: '#passwordProtection' },
  { name: 'Billing', href: '#billing' },
  { name: 'Delete Site', href: '#deleteSite' },
];

interface SettingsNavProps {
  hasGhRepository?: boolean;
}

export default function SettingsNav({ hasGhRepository }: SettingsNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeHash, setActiveHash] = useState('');

  useEffect(() => {
    // Update active hash whenever pathname or search params change
    setActiveHash(window.location.hash);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Set initial hash
    setActiveHash(window.location.hash);

    // Update hash on change
    const handleHashChange = () => {
      setActiveHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const filteredNavItems = navItems.filter(
    (item) => !item.requiresGhRepository || hasGhRepository,
  );

  return (
    <ul className="border-primary-silent space-y-2 rounded-md border px-4 py-5">
      {filteredNavItems.map((item) => (
        <li className="w-full" key={item.name}>
          <Link
            href={item.href}
            className={`block rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-primary-faint/70 ${
              activeHash === item.href ? 'bg-primary-faint' : ''
            }`}
          >
            {item.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
