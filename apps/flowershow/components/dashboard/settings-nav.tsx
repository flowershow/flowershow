'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

const navSections = [
  { name: 'General', href: '' },
  { name: 'Appearance', href: '/appearance' },
  { name: 'Content', href: '/content' },
  { name: 'Integrations', href: '/integrations' },
  { name: 'Access & Domains', href: '/access' },
  { name: 'Billing', href: '/billing' },
];

interface SettingsNavProps {
  hasGhRepository?: boolean;
}

export default function SettingsNav({ hasGhRepository: _ }: SettingsNavProps) {
  const { id } = useParams() as { id: string };
  const pathname = usePathname();
  const base = `/site/${id}/settings`;

  return (
    <ul className="border-primary-silent space-y-2 rounded-md border px-4 py-5">
      {navSections.map((section) => {
        const href = `${base}${section.href}`;
        const isActive = pathname === href;
        return (
          <li className="w-full" key={section.name}>
            <Link
              href={href}
              className={`block rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-primary-faint/70 ${isActive ? 'bg-primary-faint/70' : ''}`}
            >
              {section.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
